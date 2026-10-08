"use client";

/**
 * Chapter 1's hero: N agents and M tools. Point to point, every pair needs its own adapter
 * (N·M lines appear, one agent at a time); with a shared protocol each agent implements an MCP
 * client once and each tool an MCP server once (N+M). Frames are the engine's
 * `integrationFrames(n, m)`; changing N or M re-runs it.
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { Slider, Stat } from "@/components/ui/Controls";
import { useSvgFont } from "@/components/viz/useSvgFont";
import { integrationFrames } from "@/lib/engine/vendor/protocols/views";
import { integrationCaption } from "@/lib/proto/captions";
import { ACTOR_COLOUR, OKABE_ITO, STATE_COLOUR } from "@/lib/viz/palette";

const W = 360;
const H = 220;

export default function IntegrationWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const [n, setN] = useState(5);
  const [m, setM] = useState(6);
  const [hover, setHover] = useState<string | null>(null);
  const font = useSvgFont(W);
  const fs = font.fs;
  const data = useMemo(() => integrationFrames(n, m), [n, m]);
  const frames = data.frames as {
    phase: string;
    p2p_edges: number[][];
    agents_wired: number;
    tools_wired: number;
    built: number;
  }[];
  const st = useStepper(frames.length, { stepMs: 650, resetKey: `${n}x${m}` });
  const f = frames[st.step]!;
  const ay = (i: number) => 26 + (H - 52) * (n === 1 ? 0.5 : i / (n - 1));
  const ty = (j: number) => 26 + (H - 52) * (m === 1 ? 0.5 : j / (m - 1));
  const AX = 58;
  const TX = W - 58;
  const BUS = W / 2;
  const proto_ = f.phase === "protocol";
  const hl = f.phase === "p2p" ? "agents tools p2p" : proto_ ? "proto" : "";
  const focus = hover ?? hl;
  // hovering a term of the equation picks out what it counts
  const hoverAgents = hover === "agents";
  const hoverTools = hover === "tools";

  const visual = (
    <div className="mx-auto max-w-xl">
      <svg
        ref={font.ref}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${n} agents and ${m} tools. ${integrationCaption(f, n, m)}`}
      >
        {f.p2p_edges.map(([i, j]) => (
          <line
            key={`${i}-${j}`}
            x1={AX + 8}
            y1={ay(i!)}
            x2={TX - 8}
            y2={ty(j!)}
            stroke={OKABE_ITO.vermillion}
            strokeOpacity={i === f.agents_wired - 1 ? 0.95 : 0.45}
            strokeWidth={i === f.agents_wired - 1 ? 1.6 : 1}
            data-edge="p2p"
          />
        ))}
        {proto_ && (
          <g data-bus="mcp">
            <rect
              x={BUS - 22}
              y={14}
              width={44}
              height={H - 28}
              rx={8}
              fill={OKABE_ITO.purple}
              fillOpacity={0.15}
              stroke={OKABE_ITO.purple}
              strokeWidth={1.5}
            />
            <text
              x={BUS}
              y={H / 2 + 4}
              textAnchor="middle"
              style={{ fontSize: fs(12) }}
              className="fill-neutral-900 font-semibold dark:fill-neutral-100"
            >
              MCP
            </text>
            {Array.from({ length: n }, (_, i) => (
              <line
                key={`a${i}`}
                x1={AX + 8}
                y1={ay(i)}
                x2={BUS - 22}
                y2={ay(i)}
                stroke={ACTOR_COLOUR.client}
                strokeWidth={i < f.agents_wired ? 1.8 : 0}
                data-edge="client"
              />
            ))}
            {Array.from({ length: m }, (_, j) => (
              <line
                key={`t${j}`}
                x1={BUS + 22}
                y1={ty(j)}
                x2={TX - 8}
                y2={ty(j)}
                stroke={ACTOR_COLOUR.server}
                strokeWidth={j < f.tools_wired ? 1.8 : 0}
                data-edge="server"
              />
            ))}
          </g>
        )}
        {Array.from({ length: n }, (_, i) => (
          <g
            key={`agent${i}`}
            data-agent={i}
            data-focus={hoverAgents ? "true" : "false"}
          >
            <circle
              cx={AX}
              cy={ay(i)}
              r={8}
              fill={ACTOR_COLOUR.host}
              stroke={
                hoverAgents ||
                (f.phase === "p2p" && i === f.agents_wired - 1) ||
                (proto_ && f.tools_wired === 0 && i === f.agents_wired - 1)
                  ? STATE_COLOUR.active
                  : "none"
              }
              strokeWidth={3}
            />
          </g>
        ))}
        {Array.from({ length: m }, (_, j) => (
          <rect
            key={`tool${j}`}
            data-tool={j}
            data-focus={hoverTools ? "true" : "false"}
            x={TX - 8}
            y={ty(j) - 8}
            width={16}
            height={16}
            rx={3}
            fill={ACTOR_COLOUR.server}
            stroke={
              hoverTools || (proto_ && j === f.tools_wired - 1)
                ? STATE_COLOUR.active
                : "none"
            }
            strokeWidth={3}
          />
        ))}
        <text
          x={AX}
          y={H - 2}
          textAnchor="middle"
          style={{ fontSize: fs(10) }}
          className="fill-neutral-700 dark:fill-neutral-300"
        >
          {n} agent{n === 1 ? "" : "s"}
        </text>
        <text
          x={TX}
          y={H - 2}
          textAnchor="middle"
          style={{ fontSize: fs(10) }}
          className="fill-neutral-700 dark:fill-neutral-300"
        >
          {m} tool{m === 1 ? "" : "s"}
        </text>
      </svg>
    </div>
  );

  return (
    <AnimationPanel
      testId="integration-widget"
      title="N agents × M tools"
      summary="Every agent that wants every tool: point to point, an adapter per pair; with one protocol, one client per agent and one server per tool. Frames from the engine's integrationFrames."
      stepper={st}
      stepLabel="step"
      countFrom={0}
      caption={integrationCaption(f, n, m)}
      visual={visual}
      equation={children}
      hl={focus}
      onEquationHover={setHover}
      stats={
        <div className="grid grid-cols-3 gap-2">
          <Stat
            label="Point to point"
            value={String(data.p2p)}
            hint="N·M adapters"
          />
          <Stat
            label="With MCP"
            value={String(data.protocol)}
            hint="N+M implementations"
          />
          <Stat label="Built so far" value={String(f.built)} />
        </div>
      }
      params={
        <>
          <Slider
            label="Agents (N)"
            value={n}
            min={1}
            max={8}
            onChange={setN}
          />
          <Slider
            label="Tools (M)"
            value={m}
            min={1}
            max={10}
            onChange={setM}
          />
        </>
      }
    />
  );
}
