/**
 * The learning layer's numbers (brief 44) that are not already a path in the
 * chapters' value tree (`src/lib/proto/values.ts`): each is a ratio, a difference or
 * a share computed here from the same engine runs the chapters quote, at
 * build time. A self-check cites one as `<Check v="…">`, prose as
 * `<V v="…" />`; tests/unit/learn.test.ts checks every one against the tree.
 */
import { lookup } from "@/lib/proto/values";

const n = (path: string): number => {
  const v = lookup(path);
  if (typeof v !== "number") throw new Error(`${path} is not a number`);
  return v;
};

const VALUES: Record<string, () => number> = {
  // chapter 4: how much later the re-sent call finishes than the resumed one
  "ch04.resendExtra": () =>
    n("transports.drop.modern-5-2.elapsed_ms") -
    n("transports.drop.handshake-5-2.elapsed_ms"),
  // chapter 7: the filtered list's tokens against the four servers' lists
  "ch07.filteredShare": () =>
    n("gateway.filtered.merged_tokens") / n("gateway.flat.direct_tokens"),
  // chapter 8: how much sooner streaming delivers the first result
  "ch08.streamGain": () =>
    n("a2a.a2a_send.first_result_ms") - n("a2a.a2a_stream.first_result_ms"),
};

export const LEARN_VALUE_NAMES = Object.keys(VALUES);

const CACHE = new Map<string, number>();

export function learnValue(name: string): number {
  const cached = CACHE.get(name);
  if (cached !== undefined) return cached;
  const f = VALUES[name];
  if (!f) throw new Error(`no learn value ${name}`);
  const v = f();
  if (!Number.isFinite(v)) throw new Error(`learn value ${name} is ${v}`);
  CACHE.set(name, v);
  return v;
}
