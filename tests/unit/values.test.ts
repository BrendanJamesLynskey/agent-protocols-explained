/**
 * Every number the prose quotes is computed by the engine: each <V of="…"> path in the
 * chapters (and the paths the home, about and figure components use) resolves, and a few spot
 * values are what the sessions say they are.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { formatValue, lookup, serverChapter } from "@/lib/proto/values";

const ROOT = path.join(__dirname, "../..");
const DIR = path.join(ROOT, "content/chapters");
const SOURCES = [
  ...readdirSync(DIR).map((f) => readFileSync(path.join(DIR, f), "utf8")),
  readFileSync(path.join(ROOT, "src/app/page.tsx"), "utf8"),
  readFileSync(path.join(ROOT, "src/app/about/page.tsx"), "utf8"),
];

describe("values", () => {
  it("every path in the prose resolves", () => {
    const paths = new Set<string>();
    for (const s of SOURCES) {
      for (const m of s.matchAll(/<V of="([^"]+)"/g)) paths.add(m[1]!);
      for (const m of s.matchAll(/v\("([^"]+)"/g)) paths.add(m[1]!);
    }
    expect(paths.size).toBeGreaterThan(30);
    for (const p of paths) expect(() => lookup(p), p).not.toThrow();
  });

  it("keys with hyphens and dots resolve, missing ones throw", () => {
    expect(lookup("transports.drop.modern-5-2.redone_steps")).toBe(2);
    expect(() => lookup("transports.nope")).toThrow(/no value/);
    expect(() => lookup("lifecycle.raw_errors.http.overhead")).toThrow(
      /no value/,
    );
    expect(() => lookup("spec.current.x")).toThrow(/no value/);
  });

  it("spot values match the sessions", () => {
    expect(lookup("spec.current")).toBe("2026-07-28");
    expect(lookup("why.p2p.5x6")).toBe(30);
    expect(lookup("why.protocol.5x6")).toBe(11);
    expect(lookup("sdk.scenarios")).toBe(18);
    const s = serverChapter("why").sessions.legacy_tour!;
    expect(lookup("why.legacy_tour.messages")).toBe(s.wire.length);
    expect(lookup("transports.legacy_tour.stdio.overhead")).toBe(s.wire.length);
    expect(serverChapter("why")).toBe(serverChapter("why"));
  });

  it("formats", () => {
    expect(formatValue(1234, "int")).toBe("1,234");
    expect(formatValue(1234, "bytes")).toBe("1,234 bytes");
    expect(formatValue(1480, "ms")).toBe("1.48 s");
    expect(formatValue(0.395, "pct")).toBe("40%");
    expect(formatValue(193.5, "num")).toBe("194");
    expect(formatValue("x", "raw")).toBe("x");
  });
});
