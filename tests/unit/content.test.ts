/**
 * The chapters' MDX: each opens with its animation; every ```ts block is cut from the vendored
 * engine (whitespace-collapsed, because Prettier reformats MDX code blocks); every ```json
 * block is a message the engine sends in one of its sessions (MCP, A2A or the gateway; and so
 * the SDK, for the recorded ones); every equation compiles in KaTeX; internal links point at real pages; deck links point
 * at the owner's decks.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import katex from "katex";
import { describe, expect, it } from "vitest";

import { proto, type Obj } from "@/lib/engine";
import { nodeTokenizer } from "@/lib/engine/node";
import { SECTIONS } from "@/lib/mdx/sections";

const ROOT = path.join(__dirname, "../..");
const DIR = path.join(ROOT, "content/chapters");
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".mdx"));
const squash = (s: string) => s.replace(/\s+/g, " ").trim();
const VENDOR = path.join(ROOT, "src/lib/engine/vendor");
const tsFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory()
      ? tsFiles(p)
      : f.endsWith(".ts")
        ? [p]
        : [];
  });
const ENGINE = tsFiles(VENDOR)
  .map((f) => squash(readFileSync(f, "utf8")))
  .join("\n");
const MESSAGES: Obj[] = [
  ...[...proto.SCENARIOS, ...proto.ENGINE_SCENARIOS].flatMap((sc) =>
    (proto.play(sc).wire as Obj[])
      .filter((w) => "msg" in w)
      .map((w) => w.msg as Obj),
  ),
  // A2A: every message, and the agent card, of every scenario
  ...Object.keys(proto.a2a.A2A_SCENARIOS).flatMap((n) =>
    (proto.a2a.play(proto.a2a.a2aScenario(n)).wire as Obj[]).flatMap((w) =>
      "msg" in w
        ? [w.msg as Obj]
        : "http" in w && w.http.body
          ? [w.http.body as Obj]
          : [],
    ),
  ),
  // the gateway's messages under every policy
  ...proto.POLICIES.flatMap((p) =>
    (proto.gatewayRun(p, nodeTokenizer()).wire as Obj[]).map(
      (w) => w.msg as Obj,
    ),
  ),
];
const PAGES = ["/conformance", "/about", "/learn"];

describe("chapter files", () => {
  it("there is one per section, in order", () => {
    expect(FILES.sort()).toEqual(SECTIONS.map((s) => `${s.slug}.mdx`));
  });
});

for (const f of FILES) {
  const src = readFileSync(path.join(DIR, f), "utf8");
  describe(f, () => {
    it("opens with its animation (the hero comes before any prose)", () => {
      expect(src.trimStart()).toMatch(/^<[A-Z][a-zA-Z0-9]+Widget[ >]/);
    });

    it("cuts every TypeScript block from the vendored engine", () => {
      const blocks = [...src.matchAll(/```ts\n([\s\S]*?)```/g)].map(
        (m) => m[1]!,
      );
      expect(blocks.length).toBeGreaterThan(0);
      for (const b of blocks) expect(ENGINE, b).toContain(squash(b));
    });

    it("quotes only messages the engine sends", () => {
      for (const m of src.matchAll(/```json\n([\s\S]*?)```/g))
        expect(MESSAGES).toContainEqual(JSON.parse(m[1]!));
    });

    it("compiles every animation equation", () => {
      for (const m of src.matchAll(/tex="([^"]+)"/g)) {
        expect(() =>
          katex.renderToString(m[1]!, {
            displayMode: true,
            throwOnError: true,
            strict: "ignore",
            trust: (ctx) => ctx.command === "\\htmlClass",
          }),
        ).not.toThrow();
      }
    });

    it("links only to real pages and to the owner's decks", () => {
      const slugs = new Set<string>(SECTIONS.map((s) => s.slug));
      for (const m of src.matchAll(/\]\((\/[^)]*)\)/g)) {
        const href = m[1]!;
        if (href.startsWith("/learn/"))
          expect(slugs.has(href.slice(7)), href).toBe(true);
        else expect(PAGES).toContain(href);
      }
      for (const m of src.matchAll(
        /https:\/\/brendanjameslynskey\.github\.io\/([A-Za-z0-9_]+)\/([^)\s]*)/g,
      )) {
        const [all, repo, anchor] = m;
        if (/^LLM_Hub_/.test(repo!)) expect(anchor, all).toBe("");
        else if (repo === "MCP_04_Security_and_OAuth")
          // the root, or one of its slides (#slide-00 … #slide-09, plus the 2026-07-28
          // slides with a letter suffix such as #slide-03b; checked 2026-10-08)
          expect(anchor, all).toMatch(/^(#slide-0\d[a-z]?)?$/);
        // #slide-NN, or a suffixed 2026-07-28 slide (#slide-06b), a Reveal index or a named anchor
        else expect(anchor, all).toMatch(/^#(slide-\d\d[a-z]?|\/\d+|[a-z-]+)$/);
      }
    });

    it("has a 'Go deeper' callout and an illustrative callout", () => {
      expect(src).toContain('<Callout kind="deeper">');
      expect(src).toContain('<Callout kind="illustrative">');
    });
  });
}
