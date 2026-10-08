"use client";

/**
 * Chapter 1: one tool call end to end. The model asks for a tool; the host finds the MCP client
 * connected to the server that offers it; the client sends a JSON-RPC request; the server runs
 * the tool and answers; the content goes back into the model's context. The two wire legs are
 * the engine session's real messages (`journey` of `play(legacy_tour | modern_tour)`).
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { EngineStatus } from "@/components/agent/EngineStatus";
import { Segmented, Stat } from "@/components/ui/Controls";
import { useSvgFont } from "@/components/viz/useSvgFont";
import type { Obj } from "@/lib/engine";
import { actorName, journeyCaption } from "@/lib/proto/captions";
import { fmtInt } from "@/lib/format";
import { ACTOR_COLOUR, STATE_COLOUR } from "@/lib/viz/palette";

import { useEngine } from "./useEngine";

const ERAS = [
  { value: "legacy_tour", label: "2025-11-25" },
  { value: "modern_tour", label: "2026-07-28" },
] as const;
type Era = (typeof ERAS)[number]["value"];

const W = 360;
const NODES = ["model", "host", "client", "server"] as const;
const NX: Record<string, number> = {
  model: 40,
  host: 133,
  client: 226,
  server: 319,
};
const Y = 58;

export default function JourneyWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const engine = useEngine("why");
  const [era, setEra] = useState<Era>("legacy_tour");
  const font = useSvgFont(W);
  const fs = font.fs;
  const steps = useMemo(
    () =>
      engine.status === "ready" ? (engine.data.journeys?.[era] ?? []) : [],
    [engine, era],
  );
  const st = useStepper(steps.length, {
    stepMs: 1400,
    smooth: true,
    resetKey: era,
  });
  if (engine.status !== "ready" || steps.length === 0)
    return (
      <EngineStatus
        error={engine.status === "error" ? engine.error : undefined}
      />
    );
  const s = steps[st.step]! as Obj;
  const t = Math.min(1, st.frac * 1.2);
  const x0 = NX[s.at as string]!;
  const x1 = NX[s.to as string]!;
  const self = s.at === s.to;
  const px = self ? x0 : x0 + (x1 - x0) * t;
  const py = self ? Y - 30 - 8 * Math.sin(Math.PI * t) : Y;
  const wireBytes = (steps as Obj[])
    .slice(0, st.step + 1)
    .filter((x) => x.wire)
    .reduce(
      (a, x) => a + new TextEncoder().encode(x.payload as string).length,
      0,
    );
  let payload = s.payload as string;
  if (s.wire) {
    try {
      payload = JSON.stringify(JSON.parse(payload), null, 2);
    } catch {
      /* not JSON: show as is */
    }
  }

  const visual = (
    <div className="mx-auto max-w-xl">
      <svg
        ref={font.ref}
        viewBox={`0 0 ${W} 100`}
        className="h-auto w-full"
        role="img"
        aria-label={`One tool call from the model to the MCP server and back. Now: ${journeyCaption(s, st.step, steps.length)}`}
      >
        <rect
          x={NX.client! - 46}
          y={Y - 24}
          width={NX.server! - NX.client! + 92}
          height={48}
          rx={8}
          fill="none"
          strokeDasharray="4 3"
          className="stroke-neutral-400 dark:stroke-neutral-600"
        />
        <text
          x={(NX.client! + NX.server!) / 2}
          y={Y + 38}
          textAnchor="middle"
          style={{ fontSize: fs(9) }}
          className="fill-neutral-600 dark:fill-neutral-400"
        >
          JSON-RPC over a transport
        </text>
        <line
          x1={NX.model}
          x2={NX.server}
          y1={Y}
          y2={Y}
          className="stroke-neutral-300 dark:stroke-neutral-700"
        />
        {NODES.map((a) => {
          const on = a === s.at || a === s.to;
          return (
            <g key={a} data-node={a}>
              <rect
                x={NX[a]! - 36}
                y={Y - 16}
                width={72}
                height={32}
                rx={7}
                className="fill-white dark:fill-neutral-950"
                stroke={on ? STATE_COLOUR.active : ACTOR_COLOUR[a]}
                strokeWidth={on ? 3 : 1.5}
              />
              <text
                x={NX[a]}
                y={Y + 4}
                textAnchor="middle"
                style={{ fontSize: fs(10) }}
                className="fill-neutral-900 font-semibold dark:fill-neutral-100"
              >
                {font.narrow ? actorName(a).replace("MCP ", "") : actorName(a)}
              </text>
            </g>
          );
        })}
        <circle
          cx={px}
          cy={py}
          r={6}
          fill={s.wire ? ACTOR_COLOUR.client : STATE_COLOUR.active}
          stroke="white"
          strokeWidth={1.5}
          data-testid="packet"
        />
        <text
          x={8}
          y={14}
          style={{ fontSize: fs(9.5) }}
          className="fill-neutral-700 font-mono dark:fill-neutral-300"
        >
          {s.wire ? "on the wire" : "inside the host"}
        </text>
      </svg>
      <p className="mt-2 text-[0.72rem] text-neutral-600 dark:text-neutral-400">
        {s.wire ? "The JSON-RPC message, as sent" : "What moves at this step"}
      </p>
      <pre
        tabIndex={0}
        role="region"
        aria-label="What moves at this step"
        data-testid="journey-payload"
        className="focus-ring mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-2 font-mono text-[0.72rem] text-neutral-800 ring-1 ring-neutral-200 dark:bg-neutral-950 dark:text-neutral-200 dark:ring-neutral-800"
      >
        {payload}
      </pre>
    </div>
  );

  return (
    <AnimationPanel
      testId="journey-widget"
      title="One tool call, end to end"
      summary="The model never speaks MCP: the host and its MCP client do. The two wire messages are the engine's, which equal the official SDK's (checked in CI)."
      stepper={st}
      stepLabel="hop"
      caption={journeyCaption(s, st.step, steps.length)}
      visual={visual}
      equation={children}
      stats={
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Hop" value={`${st.step + 1}/${steps.length}`} />
          <Stat
            label="Bytes on the wire"
            value={fmtInt(wireBytes)}
            hint="so far, JSON only"
          />
        </div>
      }
      params={
        <Segmented
          label="Protocol revision"
          value={era}
          options={ERAS}
          onChange={setEra}
        />
      }
    />
  );
}
