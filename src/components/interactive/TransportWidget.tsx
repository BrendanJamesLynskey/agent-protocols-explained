"use client";

/**
 * Chapter 4: the same session on two transports. Every message is a bar: its JSON (payload)
 * and the bytes the transport wraps around it (one newline on stdio; an HTTP request line and
 * headers, or an SSE event prefix, on Streamable HTTP). The clock comes from the engine's
 * latency model (illustrative parameters). Frames are `frameSession(play(...), transport)`.
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { EngineStatus } from "@/components/agent/EngineStatus";
import { Choice, Segmented, Stat } from "@/components/ui/Controls";
import type { Obj } from "@/lib/engine";
import { transportCaption } from "@/lib/proto/captions";
import { fmtInt, fmtMs, pct } from "@/lib/format";
import { BYTES_COLOUR, STATE_COLOUR } from "@/lib/viz/palette";

import { useEngine } from "./useEngine";

const SESSIONS = [
  { value: "legacy_tour", label: "2025-11-25: a short session" },
  { value: "modern_tour", label: "2026-07-28: the same session" },
  { value: "legacy_progress", label: "2025-11-25: progress (SSE)" },
  { value: "modern_progress", label: "2026-07-28: progress (SSE)" },
  { value: "legacy_elicit_accept", label: "2025-11-25: elicitation" },
  { value: "modern_elicit_accept", label: "2026-07-28: input_required" },
];
const TRANSPORTS = [
  { value: "stdio", label: "stdio" },
  { value: "http", label: "Streamable HTTP" },
] as const;
type T = (typeof TRANSPORTS)[number]["value"];

export default function TransportWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const engine = useEngine("transports");
  const [name, setName] = useState("legacy_tour");
  const [tr, setTr] = useState<T>("http");
  const [hover, setHover] = useState<string | null>(null);
  const s = engine.status === "ready" ? engine.data.sessions[name] : undefined;
  const framed: Obj | null = s ? (tr === "http" ? s.http : s.stdio) : null;
  const frames = useMemo(
    () => (framed ? (framed.frames as Obj[]) : []),
    [framed],
  );
  const st = useStepper(frames.length, {
    stepMs: 900,
    resetKey: `${name}|${tr}`,
  });
  if (engine.status !== "ready" || !s || !framed || frames.length === 0)
    return (
      <EngineStatus
        error={engine.status === "error" ? engine.error : undefined}
      />
    );
  const label = (i: number) =>
    (s.sequence.find((x) => !x.virtual && x.wire === i)?.label as string) ?? "";
  const fr = frames[st.step]!;
  const max = Math.max(
    ...frames.map((x) => (x.payload as number) + (x.overhead as number)),
  );
  let pay = 0;
  let over = 0;
  for (let i = 0; i <= st.step; i++) {
    pay += frames[i]!.payload as number;
    over += frames[i]!.overhead as number;
  }
  const totals = framed.totals as Obj;
  const hl = fr.overhead > fr.payload ? "framing" : "payload";
  const focus = hover ?? `${hl} lat`;

  const visual = (
    <div className="mx-auto max-w-2xl">
      <div className="mb-2 flex flex-wrap gap-3 text-[0.72rem] text-neutral-700 dark:text-neutral-300">
        <span className="flex items-center gap-1">
          <span
            className="inline-block size-3 rounded-sm"
            style={{ background: BYTES_COLOUR.payload }}
          />
          JSON-RPC payload
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block size-3 rounded-sm"
            style={{
              background: `repeating-linear-gradient(45deg, ${BYTES_COLOUR.framing} 0 3px, transparent 3px 5px)`,
              outline: `1px solid ${BYTES_COLOUR.framing}`,
            }}
          />
          Transport framing
        </span>
      </div>
      <ol className="space-y-0.5" aria-label="Messages and their bytes">
        {frames.map((x, i) => {
          const seen = i <= st.step;
          const on = i === st.step;
          const wp = ((x.payload as number) / max) * 100;
          const wf = ((x.overhead as number) / max) * 100;
          return (
            <li
              key={i}
              data-row={i}
              data-active={on ? "true" : "false"}
              className={`grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-center gap-2 rounded px-1 text-[0.7rem] sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]`}
              style={
                on
                  ? { boxShadow: `0 0 0 2px ${STATE_COLOUR.active}` }
                  : undefined
              }
            >
              <span
                className={`truncate font-mono ${seen ? "text-neutral-800 dark:text-neutral-200" : "text-neutral-500 dark:text-neutral-400"}`}
              >
                {x.dir === "c2s" ? "→ " : "← "}
                {label(i)}
              </span>
              <span className={`flex h-3 min-w-0 ${seen ? "" : "opacity-30"}`}>
                <span
                  style={{ width: `${wp}%`, background: BYTES_COLOUR.payload }}
                />
                <span
                  style={{
                    width: `${wf}%`,
                    background: `repeating-linear-gradient(45deg, ${BYTES_COLOUR.framing} 0 3px, transparent 3px 5px)`,
                    outline: `1px solid ${BYTES_COLOUR.framing}`,
                  }}
                />
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[0.72rem] text-neutral-600 dark:text-neutral-400">
        The framing around message {st.step + 1}
        {tr === "http" && fr.http?.status
          ? ` (HTTP ${fr.http.status as number})`
          : ""}
      </p>
      <pre
        tabIndex={0}
        role="region"
        aria-label="The transport framing around the current message"
        data-testid="framing"
        className="focus-ring mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-2 font-mono text-[0.7rem] text-neutral-800 ring-1 ring-neutral-200 dark:bg-neutral-950 dark:text-neutral-200 dark:ring-neutral-800"
      >
        {tr === "stdio"
          ? `<${fmtInt(fr.payload as number)} bytes of JSON>\\n   (one line per message)`
          : (fr.framing as string)
              .replace(/\r/g, "")
              .replace(
                "data: \n",
                `data: <${fmtInt(fr.payload as number)} bytes of JSON>\n`,
              ) +
            (fr.http?.response
              ? `\n${(fr.http.response as string).replace(/\r/g, "")}`
              : "")}
      </pre>
    </div>
  );

  return (
    <AnimationPanel
      testId="transport-widget"
      title="Bytes and time per transport"
      summary="One session, framed for stdio or Streamable HTTP by the engine. Latency parameters are illustrative; byte counts are exact for these messages and this minimal header set."
      stepper={st}
      stepLabel="message"
      caption={transportCaption(fr, label(st.step))}
      visual={visual}
      equation={children}
      hl={focus}
      onEquationHover={setHover}
      stats={
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Payload" value={`${fmtInt(pay)} B`} hint="so far" />
          <Stat
            label="Framing"
            value={`${fmtInt(over)} B`}
            hint={`${pct(over / (pay + over))} of the bytes`}
          />
          <Stat
            label="Clock"
            value={fmtMs(fr.arrive as number)}
            hint={`whole session ${fmtMs(totals.elapsed_ms as number)}`}
          />
          <Stat
            label="HTTP requests"
            value={String(totals.posts as number)}
            hint={
              tr === "stdio" ? "none: one pipe" : "one POST per client message"
            }
          />
        </div>
      }
      params={
        <>
          <Choice
            label="Session"
            value={name}
            options={SESSIONS}
            onChange={setName}
          />
          <Segmented
            label="Transport"
            value={tr}
            options={TRANSPORTS}
            onChange={setTr}
          />
        </>
      }
    />
  );
}
