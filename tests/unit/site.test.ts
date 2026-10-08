/**
 * The small modules around the engine: number formats, captions for the rarer frames, the
 * palette, the chapter catalogue and the site constants.
 */
import { describe, expect, it } from "vitest";

import {
  actorName,
  dropCaption,
  integrationCaption,
  journeyCaption,
  sequenceCaption,
} from "@/lib/proto/captions";
import {
  clip,
  fmtInt,
  fmtMs,
  fmtTokens,
  fmtUsd,
  pct,
  trim,
} from "@/lib/format";
import {
  SECTIONS,
  getSectionMeta,
  isValidSlug,
  readSectionMdx,
} from "@/lib/mdx/sections";
import { GITHUB_URL, SITE_URL, repoFile } from "@/lib/site";
import { ACTOR_COLOUR, ACTOR_NAME, MESSAGE_COLOUR } from "@/lib/viz/palette";

describe("format", () => {
  it("durations", () => {
    expect(fmtMs(0)).toBe("0 s");
    expect(fmtMs(850)).toBe("850 ms");
    expect(fmtMs(12345)).toBe("12.3 s");
    expect(fmtMs(125_000)).toBe("2 min 5 s");
    expect(fmtMs(119_800)).toBe("2 min 0 s");
  });
  it("money, counts, percentages, clipping", () => {
    expect(fmtUsd(0)).toBe("$0");
    expect(fmtUsd(0.00236)).toBe("$0.00236");
    expect(fmtUsd(1.234)).toBe("$1.23");
    expect(fmtTokens(4342)).toBe("4,342 tokens");
    expect(fmtInt(1234.4)).toBe("1,234");
    expect(pct(0.531)).toBe("53%");
    expect(trim(0)).toBe("0");
    expect(clip("short")).toBe("short");
    expect(clip("a few words that will not fit in the space", 20)).toBe(
      "a few words that…",
    );
    expect(clip("abcdefghijklmnopqrstuvwxyz", 10)).toBe("abcdefghi…");
  });
});

describe("captions for rarer frames", () => {
  it("integration, journey and drops", () => {
    expect(integrationCaption({ phase: "apart" }, 1, 1)).toBe(
      "1 agent and 1 tool, nothing connected yet.",
    );
    expect(
      journeyCaption(
        { at: "server", to: "server", label: "x", wire: false },
        3,
        7,
      ),
    ).toBe("4/7 · MCP server: x (inside the host).");
    expect(
      dropCaption({
        t: 10,
        actor: "network",
        label: "the stream breaks",
        event_id: null,
      }),
    ).toBe("10 ms · Network: the stream breaks.");
    expect(actorName("nobody")).toBe("nobody");
    expect(
      sequenceCaption({
        from: "client",
        to: "server",
        label: "?",
        kind: "odd",
        bytes: 1,
        server: "s",
        virtual: false,
      }),
    ).toContain("(odd, 1 bytes)");
  });
});

describe("palette", () => {
  it("every actor and message kind has a colour", () => {
    for (const a of Object.keys(ACTOR_NAME))
      expect(ACTOR_COLOUR[a], a).toMatch(/^#[0-9A-Fa-f]{6}$/);
    for (const k of [
      "request",
      "notification",
      "result",
      "error",
      "gate",
      "check",
      "fail",
      "attack",
    ])
      expect(MESSAGE_COLOUR[k], k).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe("chapters and site", () => {
  it("catalogue", async () => {
    expect(SECTIONS).toHaveLength(9);
    expect(isValidSlug("01-why-a-protocol")).toBe(true);
    expect(isValidSlug("99-nope")).toBe(false);
    expect(getSectionMeta("04-transports").title).toBe("Transports");
    expect(getSectionMeta("08-agent-to-agent").title).toBe(
      "Agent to agent (A2A)",
    );
    expect(await readSectionMdx("01-why-a-protocol")).toMatch(
      /^<IntegrationWidget>/,
    );
  });
  it("constants", () => {
    expect(SITE_URL).toBe("https://agent-protocols-explained.vercel.app");
    expect(repoFile("README.md")).toBe(`${GITHUB_URL}/blob/main/README.md`);
  });
});
