"use client";

/**
 * Chapter 4: an SSE stream breaks in the middle of a tool call that reports progress.
 * 2025-11-25: the server keeps working and keeps the events; the client reconnects with
 * Last-Event-ID and the missed events are replayed. 2026-07-28: no resumption; the break
 * cancels the request and the client sends it again, so the work starts over. Steps are the
 * engine's `streamDrop(era, n, k)`; one time scale for both eras.
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { EngineStatus } from "@/components/agent/EngineStatus";
import { Segmented, Slider, Stat } from "@/components/ui/Controls";
import { useSvgFont } from "@/components/viz/useSvgFont";
import type { Obj } from "@/lib/engine";
import { dropCaption } from "@/lib/proto/captions";
import { fmtInt, fmtMs } from "@/lib/format";
import { ACTOR_COLOUR, OKABE_ITO, STATE_COLOUR } from "@/lib/viz/palette";

import { useEngine } from "./useEngine";

const ERAS = [
  { value: "handshake", label: "2025-11-25: resume" },
  { value: "modern", label: "2026-07-28: send again" },
] as const;
type Era = (typeof ERAS)[number]["value"];

const W = 360;
const H = 132;
const LANE = { client: 30, network: 66, server: 102 } as const;

export default function DropWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const engine = useEngine("transports");
  const [era, setEra] = useState<Era>("handshake");
  const [n, setN] = useState(5);
  const [k, setK] = useState(2);
  const [hover, setHover] = useState<string | null>(null);
  const font = useSvgFont(W);
  const fs = font.fs;
  const kk = Math.min(k, n - 1);
  const drops = engine.status === "ready" ? engine.data.drops : undefined;
  const d: Obj | undefined = drops?.[`${era}-${n}-${kk}`];
  const other: Obj | undefined =
    drops?.[`${era === "handshake" ? "modern" : "handshake"}-${n}-${kk}`];
  const steps = useMemo(() => (d ? (d.steps as Obj[]) : []), [d]);
  const st = useStepper(steps.length, {
    stepMs: 800,
    resetKey: `${era}|${n}|${kk}`,
  });
  if (engine.status !== "ready" || !d || !other || steps.length === 0)
    return (
      <EngineStatus
        error={engine.status === "error" ? engine.error : undefined}
      />
    );
  const s = steps[st.step]!;
  const tmax =
    Math.max(d.totals.elapsed_ms as number, other.totals.elapsed_ms as number) *
    1.04;
  const X0 = 52;
  const X1 = W - 10;
  const x = (t: number) => X0 + ((X1 - X0) * t) / tmax;
  let hl = "work";
  if (s.kind === "drop" || s.kind === "cancel") hl = "redone";
  else if (s.kind === "resume" || s.kind === "post") hl = "reconnect";
  else if (s.kind === "replay") hl = "reconnect";
  const focus = hover ?? hl;
  let sent = 0;
  for (let i = 0; i <= st.step; i++)
    if (steps[i]!.live) sent += steps[i]!.bytes as number;

  const mark = (e: Obj, i: number) => {
    const on = i === st.step;
    const cx = x(e.t as number);
    const col = on ? STATE_COLOUR.active : undefined;
    switch (e.kind) {
      case "post":
      case "resume":
        return (
          <line
            key={i}
            x1={cx}
            x2={cx}
            y1={LANE.client}
            y2={LANE.server - 6}
            stroke={col ?? ACTOR_COLOUR.client}
            strokeWidth={on ? 2.5 : 1.5}
            strokeDasharray={e.kind === "resume" ? "3 2" : undefined}
            markerEnd="url(#drop-down)"
            data-kind={e.kind}
          />
        );
      case "event":
      case "replay":
        return (
          <line
            key={i}
            x1={cx}
            x2={cx}
            y1={LANE.server}
            y2={LANE.client + 6}
            stroke={
              col ??
              (e.kind === "replay" ? OKABE_ITO.purple : ACTOR_COLOUR.server)
            }
            strokeWidth={on ? 2.5 : 1.2}
            strokeDasharray={e.kind === "replay" ? "3 2" : undefined}
            markerEnd="url(#drop-up)"
            data-kind={e.kind}
          />
        );
      case "buffered":
        return (
          <rect
            key={i}
            x={cx - 4}
            y={LANE.server - 4}
            width={8}
            height={8}
            fill="url(#drop-hatch)"
            stroke={col ?? ACTOR_COLOUR.server}
            data-kind="buffered"
          />
        );
      case "drop":
        return (
          <path
            key={i}
            d={`M${cx - 7} ${LANE.network - 7} l4 7 l-4 7 M${cx + 1} ${LANE.network - 7} l4 7 l-4 7`}
            stroke={col ?? OKABE_ITO.vermillion}
            strokeWidth={2}
            fill="none"
            data-kind="drop"
          />
        );
      default:
        return (
          <text
            key={i}
            x={cx}
            y={LANE.server + 4}
            textAnchor="middle"
            style={{ fontSize: fs(11) }}
            fill={col ?? OKABE_ITO.vermillion}
            data-kind={e.kind as string}
          >
            ✕
          </text>
        );
    }
  };

  const visual = (
    <div className="mx-auto max-w-xl">
      <svg
        ref={font.ref}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`A broken SSE stream, ${era === "handshake" ? "resumed" : "sent again"}. Now: ${dropCaption(s)}`}
      >
        <defs>
          <marker
            id="drop-down"
            viewBox="0 0 8 8"
            refX={4}
            refY={7}
            markerWidth={5}
            markerHeight={5}
            orient="auto"
          >
            <path d="M0 0 L8 4 L0 8 z" className="fill-neutral-500" />
          </marker>
          <marker
            id="drop-up"
            viewBox="0 0 8 8"
            refX={4}
            refY={7}
            markerWidth={5}
            markerHeight={5}
            orient="auto"
          >
            <path d="M0 0 L8 4 L0 8 z" className="fill-neutral-500" />
          </marker>
          <pattern
            id="drop-hatch"
            width={4}
            height={4}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width={4} height={4} fill="white" />
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={4}
              stroke={ACTOR_COLOUR.server}
              strokeWidth={2}
            />
          </pattern>
        </defs>
        {(Object.keys(LANE) as (keyof typeof LANE)[]).map((l) => (
          <g key={l}>
            <line
              x1={X0}
              x2={X1}
              y1={LANE[l]}
              y2={LANE[l]}
              className="stroke-neutral-300 dark:stroke-neutral-700"
            />
            <text
              x={2}
              y={LANE[l] + 4}
              style={{ fontSize: fs(9.5) }}
              className="fill-neutral-700 dark:fill-neutral-300"
            >
              {l === "client" ? "Client" : l === "server" ? "Server" : "Stream"}
            </text>
          </g>
        ))}
        {steps.slice(0, st.step + 1).map(mark)}
        <text
          x={X0}
          y={H - 4}
          style={{ fontSize: fs(9) }}
          className="fill-neutral-600 font-mono dark:fill-neutral-400"
        >
          0 s
        </text>
        <text
          x={X1}
          y={H - 4}
          textAnchor="end"
          style={{ fontSize: fs(9) }}
          className="fill-neutral-600 font-mono dark:fill-neutral-400"
        >
          {fmtMs(tmax)}
        </text>
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem] text-neutral-700 dark:text-neutral-300">
        <li>↓ request (solid) · resume (dashed)</li>
        <li>↑ event (green) · replayed event (purple, dashed)</li>
        <li>▨ kept by the server</li>
        <li>≫ stream breaks · ✕ request cancelled</li>
      </ul>
    </div>
  );

  return (
    <AnimationPanel
      testId="drop-widget"
      title="A stream breaks mid-call"
      summary="A tool call that reports progress over Streamable HTTP, and the SSE stream drops. Resumed with Last-Event-ID (2025-11-25), or lost and sent again (2026-07-28). Timings illustrative."
      stepper={st}
      stepLabel="event"
      caption={dropCaption(s)}
      visual={visual}
      equation={children}
      hl={focus}
      onEquationHover={setHover}
      stats={
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label="Finished at"
            value={fmtMs(d.totals.elapsed_ms as number)}
            hint={`other era ${fmtMs(other.totals.elapsed_ms as number)}`}
          />
          <Stat
            label="Work steps"
            value={String(d.totals.work_steps as number)}
            hint={`${d.totals.redone_steps as number} done twice`}
          />
          <Stat
            label="Replayed events"
            value={String(d.totals.replayed_events as number)}
          />
          <Stat
            label="Bytes sent"
            value={fmtInt(sent)}
            hint={`of ${fmtInt(d.totals.bytes as number)}`}
          />
        </div>
      }
      params={
        <>
          <Segmented
            label="Revision"
            value={era}
            options={ERAS}
            onChange={setEra}
          />
          <Slider
            label="Progress steps (n)"
            value={n}
            min={3}
            max={8}
            onChange={(v) => {
              setN(v);
              if (k > v - 1) setK(v - 1);
            }}
          />
          <Slider
            label="Break after event (k)"
            value={kk}
            min={1}
            max={n - 1}
            onChange={setK}
          />
        </>
      }
    />
  );
}
