/**
 * The live caption under each animation: one line per step, built from the engine's frame, so
 * a screen-reader user follows the same story (it is also the aria-live region). Pure
 * functions of the frames: tests/unit/frames.test.ts checks they read the same from the Python
 * reference's frames as from the TS port's, and the e2e frame specs read them off the page.
 */
import type { Obj } from "@/lib/engine";
import { fmtInt, fmtMs } from "@/lib/format";
import { A2A_NAMES, ACTOR_NAME } from "@/lib/viz/palette";

export function actorName(a: string): string {
  return ACTOR_NAME[a] ?? a;
}

const KIND_WORD: Record<string, string> = {
  request: "request",
  notification: "notification",
  result: "result",
  error: "error",
  malformed: "not JSON",
  gate: "inside the host",
};

export function integrationCaption(f: Obj, n: number, m: number): string {
  if (f.phase === "apart")
    return `${n} agent${n === 1 ? "" : "s"} and ${m} tool${m === 1 ? "" : "s"}, nothing connected yet.`;
  if (f.phase === "p2p")
    return `Point to point: agent ${f.agents_wired} gets its own adapter for each of the ${m} tools. ${fmtInt(f.built)} adapters so far; N·M = ${n * m}.`;
  if (f.tools_wired === 0)
    return `With a protocol: agent ${f.agents_wired} implements an MCP client once. ${fmtInt(f.built)} implementations so far; N+M = ${n + m}.`;
  return `With a protocol: tool ${f.tools_wired} implements an MCP server once. ${fmtInt(f.built)} implementations so far; N+M = ${n + m}.`;
}

export function journeyCaption(s: Obj, i: number, total: number): string {
  const where = s.wire ? "on the wire" : "inside the host";
  const hop =
    s.at === s.to ? actorName(s.at) : `${actorName(s.at)} → ${actorName(s.to)}`;
  return `${i + 1}/${total} · ${hop}: ${s.label} (${where}).`;
}

export function sequenceCaption(f: Obj): string {
  if (f.virtual)
    return `Inside the host: ${actorName(f.from)} → ${actorName(f.to)}: ${f.label}.`;
  const head = `${actorName(f.from)} → ${actorName(f.to)}: ${f.label} (${KIND_WORD[f.kind] ?? f.kind}, ${fmtInt(f.bytes)} bytes).`;
  // what the server is doing is known once it has answered
  return f.from === "server" ? `${head} Server: ${f.server}.` : head;
}

export function transportCaption(fr: Obj, label: string): string {
  const dir = fr.dir === "c2s" ? "Client → server" : "Server → client";
  return `${dir}: ${label}. ${fmtInt(fr.payload)} B of JSON + ${fmtInt(fr.overhead)} B of framing; leaves at ${fmtMs(fr.depart)}, arrives ${fmtMs(fr.arrive)}.`;
}

export function dropCaption(s: Obj): string {
  const ev =
    s.event_id !== null && s.event_id !== undefined
      ? ` (event id ${s.event_id})`
      : "";
  return `${fmtMs(s.t)} · ${actorName(s.actor)}: ${s.label}${ev}.`;
}

/** Chapters 6 and 9: one step of an OAuth flow or an attack (engine `flowFrames`). */
export function flowCaption(f: Obj): string {
  const who = `${actorName(f.from)} → ${actorName(f.to)}`;
  switch (f.kind) {
    case "check":
      return `${actorName(f.from)} checks: ${f.label}. Passes.`;
    case "fail":
      return `${actorName(f.from)} checks: ${f.label}. Fails: the flow stops here.`;
    case "attack":
      return `Attack: ${f.label}.`;
    case "gate":
      return `${who}: ${f.label} (off the wire).`;
    case "error":
      return `${who}: ${f.label} (refused).`;
    default:
      return `${who}: ${f.label}.`;
  }
}

/** Chapter 7: one step of the gateway walk-through (engine `gatewayRun` frames). */
export function gatewayCaption(f: Obj): string {
  if (f.virtual)
    return f.from === f.to
      ? `${actorName(f.from)}: ${f.label}.`
      : `${actorName(f.from)} → ${actorName(f.to)}: ${f.label} (inside the host).`;
  return `${actorName(f.from)} → ${actorName(f.to)}: ${f.label} (${fmtInt(f.bytes)} bytes).`;
}

export function a2aName(a: string): string {
  return A2A_NAMES[a] ?? a;
}

/** Chapter 8: one message between the two agents (engine `a2aFrames`). */
export function a2aCaption(f: Obj): string {
  const who = `${a2aName(f.from)} → ${a2aName(f.to)}`;
  if (f.virtual) return `Outside A2A, ${fmtMs(f.t)}: ${who}: ${f.label}.`;
  const what = f.sse ? "SSE event" : (KIND_WORD[f.kind] ?? f.kind);
  const task =
    f.task !== null && f.task !== undefined
      ? ` Task: ${String(f.task).replace("TASK_STATE_", "").toLowerCase().replaceAll("_", " ")}.`
      : "";
  return `${fmtMs(f.t)} · ${who}: ${f.label} (${what}, ${fmtInt(f.bytes)} bytes).${task}`;
}
