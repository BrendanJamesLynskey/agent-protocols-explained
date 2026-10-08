/**
 * The vendored Agent_Loop_Sim engine (src/lib/engine/vendor, pinned in VENDORED.json) and what
 * each chapter animates (src/data/chapter_configs.json): MCP sessions played by the protocol
 * state machines, framed on each transport, and the views derived from them. Nothing here
 * calls a language model, and nothing opens a network connection: the sessions are simulated.
 */
import CONFIGS from "@/data/chapter_configs.json";

import { protocols as P, type Obj, type Tokenizer } from "./vendor/index";

export * from "./vendor/index";
export const proto = P;

export type Chapter = keyof typeof CONFIGS;
export const CHAPTER_CONFIGS = CONFIGS as unknown as Record<Chapter, Obj>;

/** Where the client fetches the tokenizer's merges (only chapter 3 needs it). */
export const MERGES_URL = "/tokenizer/qwen2.5-merges.txt";

/** One MCP session, with everything the animations draw from it. */
export type Session = {
  name: string;
  title: string;
  mode: string;
  wire: Obj[];
  log: Obj[];
  sequence: Obj[];
  negotiation: Obj;
  stdio: Obj;
  http: Obj | null;
};

export function session(name: string): Session {
  const sc = P.protocolScenario(name);
  const p = P.play(sc);
  return {
    name,
    title: sc.title as string,
    mode: sc.mode as string,
    wire: p.wire,
    log: p.log,
    sequence: P.sequenceFrames(p),
    negotiation: P.negotiation(p),
    stdio: P.frameSession(p.log, p.wire, "stdio"),
    http: sc.mode === "raw" ? null : P.frameSession(p.log, p.wire, "http"),
  };
}

/** Every SSE drop the transports chapter can show: both eras, n events, a break after k. */
export function drops(ns: number[]): Record<string, Obj> {
  const out: Record<string, Obj> = {};
  for (const era of ["handshake", "modern"])
    for (const n of ns)
      for (let k = 1; k < n; k++)
        out[`${era}-${n}-${k}`] = P.streamDrop(era, n, k);
  return out;
}

export type ChapterData = {
  sessions: Record<string, Session>;
  threeWays?: Record<string, Obj[]>;
  journeys?: Record<string, Obj[]>;
  drops?: Record<string, Obj>;
};

/** Everything one chapter animates. `tok` is needed only where tokens are counted. */
export function runChapter(
  chapter: Chapter,
  tok: Tokenizer | null,
): ChapterData {
  const cfg = CHAPTER_CONFIGS[chapter];
  const sessions: Record<string, Session> = {};
  for (const n of cfg.scenarios as string[]) sessions[n] = session(n);
  const out: ChapterData = { sessions };
  if (chapter === "why") {
    out.journeys = {};
    for (const n of cfg.scenarios as string[])
      out.journeys[n] = P.journey(P.play(P.protocolScenario(n)));
  }
  if (cfg.tokens) {
    if (!tok) throw new Error("this chapter needs the tokenizer");
    out.threeWays = {};
    for (const n of cfg.scenarios as string[])
      out.threeWays[n] = P.threeWays(P.play(P.protocolScenario(n)), tok);
  }
  if (cfg.drops) out.drops = drops(cfg.drops.n as number[]);
  return out;
}

export function needsTokenizer(chapter: Chapter): boolean {
  return Boolean(CHAPTER_CONFIGS[chapter].tokens);
}
