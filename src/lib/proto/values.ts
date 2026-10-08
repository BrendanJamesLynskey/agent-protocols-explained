/**
 * Every number the chapters quote comes from here: a path into a summary of the engine's runs
 * (the same sessions the animations draw, src/data/chapter_configs.json), e.g.
 * "transports.legacy_tour.http.overhead" or "primitives.legacy.tool.tokens". The MDX writes
 * <V of="…" fmt="…" />, so prose cannot drift from the tested engine (tests/unit/values.test.ts
 * checks every path the chapters use resolves).
 *
 * Server-side only: it reads the tokenizer from disk.
 */
import SDK from "@/data/sdk_exchanges.json";
import {
  CHAPTER_CONFIGS,
  proto,
  runChapter,
  type Chapter,
  type ChapterData,
  type Obj,
} from "@/lib/engine";
import { nodeTokenizer } from "@/lib/engine/node";
import { fmtInt, fmtMs, pct, trim } from "@/lib/format";

export type Fmt = "int" | "bytes" | "ms" | "pct" | "num" | "raw";

const CACHE = new Map<Chapter, ChapterData>();

/** A chapter's data, computed once per server process. */
export function serverChapter(chapter: Chapter): ChapterData {
  let d = CACHE.get(chapter);
  if (!d) {
    d = runChapter(chapter, nodeTokenizer());
    CACHE.set(chapter, d);
  }
  return d;
}

function sessionSummary(s: ChapterData["sessions"][string]): Obj {
  const wire = s.wire.filter((w) => "msg" in w);
  const c2sReq = s.log.filter(
    (l) => l.dir === "c2s" && l.kind === "request",
  ).length;
  return {
    messages: s.wire.length,
    requests: c2sReq,
    bytes: s.log.reduce((a, l) => a + (l.bytes as number), 0),
    json_messages: wire.length,
    stdio: s.stdio.totals,
    http: s.http ? s.http.totals : null,
    http_overhead_frac: s.http
      ? (s.http.totals.overhead as number) /
        ((s.http.totals.overhead as number) + (s.http.totals.payload as number))
      : null,
    http_overhead_per_message: s.http
      ? (s.http.totals.overhead as number) / (s.http.totals.messages as number)
      : null,
    stdio_overhead_frac:
      (s.stdio.totals.overhead as number) /
      ((s.stdio.totals.overhead as number) +
        (s.stdio.totals.payload as number)),
  };
}

let TREE: Obj | null = null;

export function tree(): Obj {
  if (TREE) return TREE;
  const t: Obj = {};
  for (const ch of Object.keys(CHAPTER_CONFIGS) as Chapter[]) {
    const d = serverChapter(ch);
    t[ch] = {};
    for (const [k, s] of Object.entries(d.sessions))
      t[ch][k] = sessionSummary(s);
    if (d.threeWays) {
      for (const [k, rows] of Object.entries(d.threeWays)) {
        const era = k.startsWith("legacy") ? "legacy" : "modern";
        t[ch][era] = {};
        for (const r of rows)
          t[ch][era][r.primitive as string] = {
            messages: (r.messages as number[]).length,
            bytes: r.bytes,
            tokens: r.tokens,
          };
      }
    }
    if (d.drops) {
      t[ch].drop = {};
      for (const [k, v] of Object.entries(d.drops)) t[ch].drop[k] = v.totals;
    }
  }
  t.why.p2p = {};
  t.why.protocol = {};
  for (const [n, m] of CHAPTER_CONFIGS.why.integration as number[][]) {
    const f = proto.integrationFrames(n!, m!);
    t.why.p2p[`${n}x${m}`] = f.p2p;
    t.why.protocol[`${n}x${m}`] = f.protocol;
  }
  // the 2026-07-28 envelope: bytes a request carries in _meta, averaged over a session
  const modern = serverChapter("lifecycle").sessions.modern_tour!;
  const reqs = modern.wire.filter((w) => w.dir === "c2s");
  const metaBytes = reqs.map(
    (w) =>
      new TextEncoder().encode(JSON.stringify(w.msg)).length -
      new TextEncoder().encode(
        JSON.stringify({
          ...w.msg,
          params: { ...w.msg.params, _meta: undefined },
        }),
      ).length,
  );
  t.lifecycle.meta_bytes =
    metaBytes.reduce((a, b) => a + b, 0) / metaBytes.length;
  t.params = { transports: proto.TRANSPORTS, work: proto.WORK_MS };
  t.sdk = {
    version: SDK.sdk,
    scenarios: Object.keys(SDK.scenarios).length,
    messages: Object.values(SDK.scenarios).reduce(
      (a, v) => a + (v as unknown[]).length,
      0,
    ),
  };
  t.spec = { current: proto.LATEST, accessed: proto.SPEC_ACCESSED };
  TREE = t;
  return t;
}

export function lookup(path: string): unknown {
  // keys may contain dots: at each level take the shortest run of segments that names a key
  const parts = path.split(".");
  let v: unknown = tree();
  let i = 0;
  while (i < parts.length) {
    if (v === null || typeof v !== "object")
      throw new Error(`no value at "${path}"`);
    let j = i + 1;
    while (j <= parts.length && !(parts.slice(i, j).join(".") in (v as Obj)))
      j++;
    if (j > parts.length) throw new Error(`no value at "${path}"`);
    v = (v as Obj)[parts.slice(i, j).join(".")];
    i = j;
  }
  if (v === undefined || v === null) throw new Error(`no value at "${path}"`);
  return v;
}

export function formatValue(v: unknown, fmt: Fmt): string {
  if (fmt === "raw") return String(v);
  const n = v as number;
  switch (fmt) {
    case "int":
      return fmtInt(n);
    case "bytes":
      return `${fmtInt(n)} bytes`;
    case "ms":
      return fmtMs(n);
    case "pct":
      return pct(n);
    case "num":
      return trim(n);
  }
}
