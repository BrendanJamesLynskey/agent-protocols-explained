"use client";

/**
 * A message sequence chart drawn from the engine's `sequenceFrames`: one lifeline per actor,
 * one arrow per message, the arrow being animated travelling (`frac`). Requests are solid,
 * notifications dashed, results in green and errors in the warning hue with a cross (never
 * colour alone); arrows inside the host (asking the user or a model) are dashed purple. A
 * window of the last rows keeps the chart a fixed height.
 */
import type { Obj } from "@/lib/engine";
import { actorName } from "@/lib/proto/captions";
import { ACTOR_COLOUR, MESSAGE_COLOUR, STATE_COLOUR } from "@/lib/viz/palette";

import { useSvgFont } from "@/components/viz/useSvgFont";

const W = 360;
const TOP = 44;
const ROW = 26;

export function actorsOf(frames: Obj[]): string[] {
  const set = new Set<string>();
  for (const f of frames) {
    set.add(f.from as string);
    set.add(f.to as string);
  }
  const order = ["user", "model", "host", "client", "server"];
  return order.filter((a) => set.has(a) || a === "client" || a === "server");
}

export function SequenceChart({
  frames,
  step,
  frac,
  rows = 9,
  label,
}: {
  frames: Obj[];
  step: number;
  frac: number;
  rows?: number;
  label: string;
}): JSX.Element {
  const font = useSvgFont(W);
  const fs = font.fs;
  const actors = actorsOf(frames);
  const left = 52;
  const right = W - 40;
  const x = (a: string) =>
    actors.length === 1
      ? (left + right) / 2
      : left + ((right - left) * actors.indexOf(a)) / (actors.length - 1);
  const shown = Math.min(rows, frames.length);
  const first = Math.max(0, Math.min(step - shown + 1, frames.length - shown));
  const H = TOP + shown * ROW + 8;
  const span = (right - left) / Math.max(1, actors.length - 1);
  const maxChars = Math.max(12, Math.floor((span + 40) / (fs(9.5) * 0.58)));
  const clipText = (s: string) =>
    s.length > maxChars ? `${s.slice(0, maxChars - 1)}…` : s;

  return (
    <svg
      ref={font.ref}
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={label}
      data-rows-first={first}
    >
      <defs>
        {Object.entries({ ...MESSAGE_COLOUR, active: STATE_COLOUR.active }).map(
          ([k, c]) => (
            <marker
              key={k}
              id={`seq-arrow-${k}`}
              viewBox="0 0 8 8"
              refX={7}
              refY={4}
              markerWidth={6}
              markerHeight={6}
              orient="auto-start-reverse"
            >
              <path d="M0 0 L8 4 L0 8 z" fill={c} />
            </marker>
          ),
        )}
      </defs>
      {actors.map((a) => (
        <g key={a} data-actor={a}>
          <line
            x1={x(a)}
            x2={x(a)}
            y1={TOP - 6}
            y2={H - 4}
            className="stroke-neutral-300 dark:stroke-neutral-700"
            strokeWidth={1}
          />
          <rect
            x={x(a) - 34}
            y={6}
            width={68}
            height={24}
            rx={5}
            className="fill-white dark:fill-neutral-950"
            stroke={ACTOR_COLOUR[a]}
            strokeWidth={1.5}
          />
          <text
            x={x(a)}
            y={22}
            textAnchor="middle"
            style={{ fontSize: fs(9.5) }}
            className="fill-neutral-900 font-semibold dark:fill-neutral-100"
          >
            {font.narrow && actorName(a).length > 8
              ? actorName(a).replace("MCP ", "")
              : actorName(a)}
          </text>
        </g>
      ))}
      {frames.slice(first, first + shown).map((f, r) => {
        const k = first + r;
        if (k > step) return null;
        const y = TOP + r * ROW + 16;
        const x1 = x(f.from);
        const x2 = x(f.to);
        const on = k === step;
        const kind = f.virtual ? "gate" : (f.kind as string);
        const colour = on
          ? STATE_COLOUR.active
          : (MESSAGE_COLOUR[kind] ?? "#737373");
        const dashed = f.virtual || f.kind === "notification";
        const t = on ? Math.min(1, frac * 1.25) : 1;
        const dir = x2 >= x1 ? 1 : -1;
        const xe = x1 + (x2 - x1) * t;
        const isErr = f.kind === "error" || f.kind === "malformed";
        return (
          <g
            key={k}
            data-row={k}
            data-active={on ? "true" : "false"}
            data-kind={kind}
          >
            <text
              x={4}
              y={y + 3}
              style={{ fontSize: fs(8.5) }}
              className="fill-neutral-500 font-mono dark:fill-neutral-400"
            >
              {k + 1}
            </text>
            <path
              d={`M${x1} ${y} L${xe - dir * 1} ${y}`}
              stroke={colour}
              strokeWidth={on ? 2.4 : 1.3}
              strokeDasharray={dashed ? "4 3" : undefined}
              markerEnd={
                t >= 1 ? `url(#seq-arrow-${on ? "active" : kind})` : undefined
              }
              fill="none"
            />
            {on && t < 1 && (
              <circle cx={xe} cy={y} r={4.5} fill={STATE_COLOUR.active} />
            )}
            {isErr && (
              <text
                x={x2 - dir * 10}
                y={y - 3}
                textAnchor="middle"
                style={{ fontSize: fs(10) }}
                fill={MESSAGE_COLOUR.error}
                aria-hidden="true"
              >
                ✕
              </text>
            )}
            <text
              x={(x1 + x2) / 2}
              y={y - 5}
              textAnchor="middle"
              style={{ fontSize: fs(9.5) }}
              className={
                on
                  ? "fill-neutral-900 font-mono dark:fill-neutral-100"
                  : "fill-neutral-600 font-mono dark:fill-neutral-400"
              }
            >
              {clipText(f.label as string)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
