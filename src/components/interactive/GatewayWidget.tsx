"use client";

/**
 * Chapter 7: an MCP gateway in front of four servers (engine `gatewayRun`). The hub diagram
 * animates each message of the walk-through: the host lists tools through the gateway, the
 * gateway lists every server and merges, the model calls web search, and the gateway routes it.
 * The policy (flat names, prefixed names, prefixed and filtered) re-runs the engine's merge:
 * the tool table shows which tools are exposed, shadowed or filtered (by text and pattern, not
 * colour alone), and the bars show the tool list's token cost (Qwen2.5 tokenizer).
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { EngineStatus } from "@/components/agent/EngineStatus";
import { Segmented, Stat } from "@/components/ui/Controls";
import { useSvgFont } from "@/components/viz/useSvgFont";
import type { Obj } from "@/lib/engine";
import { fmtInt } from "@/lib/format";
import { actorName, gatewayCaption } from "@/lib/proto/captions";
import { ACTOR_COLOUR, MESSAGE_COLOUR, STATE_COLOUR } from "@/lib/viz/palette";

import { Hatch } from "./Hatch";
import { useEngine } from "./useEngine";

type Policy = "flat" | "prefix" | "filtered";

const W = 360;
const H = 220;
const POS: Record<string, [number, number]> = {
  model: [48, 52],
  client: [48, 160],
  gateway: [176, 106],
  files: [304, 28],
  github: [304, 80],
  web: [304, 132],
  calendar: [304, 184],
};
const BOX: [number, number] = [76, 30];

export default function GatewayWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const engine = useEngine("gateway");
  const [policy, setPolicy] = useState<Policy>("flat");
  const run =
    engine.status === "ready" ? engine.data.gateways?.[policy] : undefined;
  const frames = useMemo(() => (run ? (run.frames as Obj[]) : []), [run]);
  const st = useStepper(frames.length, {
    stepMs: 1000,
    smooth: true,
    resetKey: policy,
  });
  const font = useSvgFont(W);
  if (engine.status !== "ready" || !run || frames.length === 0)
    return (
      <EngineStatus
        error={engine.status === "error" ? engine.error : undefined}
      />
    );

  const fs = font.fs;
  const f = frames[st.step]!;
  const rows = (run.merge as Obj).rows as Obj[];
  const listed = frames.findIndex(
    (x) => x.from === "gateway" && x.to === "client",
  );
  const showMerged = st.step >= listed;
  const label = String(f.label);
  let hl = "";
  if (
    label.startsWith("merge") ||
    (f.from === "gateway" && f.to === "client" && label.includes("tokens"))
  )
    hl = "sum";
  else if (label.startsWith("route")) hl = "route";
  else if (
    f.from !== "gateway" &&
    f.to === "gateway" &&
    label.includes("tokens")
  )
    hl = "server";
  const perServer = run.per_server as Obj[];
  const maxTok = Math.max(
    run.direct_tokens as number,
    run.merged_tokens as number,
  );

  const edge = (a: string, b: string) => {
    const [x1, y1] = POS[a]!;
    const [x2, y2] = POS[b]!;
    return { x1, y1, x2, y2 };
  };
  const pairs: [string, string][] = [
    ["model", "client"],
    ["client", "gateway"],
    ["gateway", "files"],
    ["gateway", "github"],
    ["gateway", "web"],
    ["gateway", "calendar"],
  ];
  const activePair = (a: string, b: string) =>
    (f.from === a && f.to === b) || (f.from === b && f.to === a);
  const isErr = f.kind === "error";
  const t = Math.min(1, st.frac * 1.25);

  const visual = (
    <div className="mx-auto max-w-xl">
      <svg
        ref={font.ref}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`A gateway in front of four MCP servers. Now: ${gatewayCaption(f)}`}
        data-testid="gateway-hub"
      >
        <defs>
          <Hatch id="gw-hatch" colour={MESSAGE_COLOUR.error!} />
        </defs>
        {pairs.map(([a, b]) => {
          const e = edge(a, b);
          const on = activePair(a, b);
          return (
            <line
              key={`${a}-${b}`}
              {...e}
              stroke={
                on
                  ? isErr
                    ? MESSAGE_COLOUR.error
                    : STATE_COLOUR.active
                  : "#a3a3a3"
              }
              strokeWidth={on ? 2.6 : 1.2}
              strokeDasharray={a === "model" ? "4 3" : undefined}
              data-active={on ? "true" : "false"}
            />
          );
        })}
        {f.from !== f.to && POS[f.from as string] && POS[f.to as string] && (
          <circle
            cx={
              POS[f.from as string]![0] +
              (POS[f.to as string]![0] - POS[f.from as string]![0]) * t
            }
            cy={
              POS[f.from as string]![1] +
              (POS[f.to as string]![1] - POS[f.from as string]![1]) * t
            }
            r={5}
            fill={STATE_COLOUR.active}
            data-testid="gateway-packet"
          />
        )}
        {Object.entries(POS).map(([a, [x, y]]) => {
          const on = f.from === a || f.to === a;
          const wrong = isErr && a === "gateway";
          return (
            <g key={a} data-node={a} data-active={on ? "true" : "false"}>
              <rect
                x={x - BOX[0] / 2}
                y={y - BOX[1] / 2}
                width={BOX[0]}
                height={BOX[1]}
                rx={6}
                className="fill-white dark:fill-neutral-950"
                stroke={on ? STATE_COLOUR.active : ACTOR_COLOUR[a]}
                strokeWidth={on ? 2.6 : 1.5}
              />
              {wrong && (
                <rect
                  x={x - BOX[0] / 2}
                  y={y - BOX[1] / 2}
                  width={BOX[0]}
                  height={BOX[1]}
                  rx={6}
                  fill="url(#gw-hatch)"
                  opacity={0.5}
                />
              )}
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                style={{ fontSize: fs(10) }}
                className="fill-neutral-900 font-semibold dark:fill-neutral-100"
              >
                {a === "client" ? "Host" : actorName(a)}
              </text>
            </g>
          );
        })}
      </svg>
      <p
        className="mt-1 text-center font-mono text-[0.72rem] text-neutral-700 dark:text-neutral-300"
        data-testid="gateway-label"
      >
        {label}
      </p>

      <div className="mt-3 overflow-x-auto rounded bg-white p-2 ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800">
        <table className="w-full text-left text-xs" data-testid="gateway-tools">
          <caption className="mb-1 text-left text-neutral-600 dark:text-neutral-400">
            Every downstream tool and what the host sees
            {showMerged ? "" : " (after the merge)"}
          </caption>
          <thead>
            <tr className="text-neutral-600 dark:text-neutral-400">
              <th scope="col" className="pr-2 font-normal">
                Server
              </th>
              <th scope="col" className="pr-2 font-normal">
                Tool
              </th>
              <th scope="col" className="font-normal">
                Exposed as
              </th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {rows.map((r) => {
              const exposed = r.status === "exposed";
              const routed =
                showMerged &&
                run.routed_to === r.alias &&
                r.tool === "search" &&
                exposed &&
                st.step >=
                  frames.findIndex((x) => String(x.label).startsWith("route"));
              return (
                <tr
                  key={`${r.alias}-${r.tool}`}
                  data-status={r.status}
                  className={
                    showMerged && !exposed
                      ? "text-neutral-500 line-through dark:text-neutral-400"
                      : ""
                  }
                >
                  <td className="pr-2">{r.alias}</td>
                  <td className="pr-2">{r.tool}</td>
                  <td>
                    {!showMerged
                      ? "…"
                      : exposed
                        ? `${r.exposed}${routed ? " ← routed" : ""}`
                        : r.status === "shadowed"
                          ? `shadowed by ${r.shadowed_by}'s`
                          : "filtered out"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid gap-1 text-xs" data-testid="gateway-tokens">
        <p className="text-neutral-600 dark:text-neutral-400">
          Tokens of tool definitions in the model&apos;s prompt (Qwen2.5)
        </p>
        {perServer.map((p) => (
          <Bar
            key={p.alias as string}
            label={`${p.alias} (${p.tools})`}
            value={p.tokens as number}
            max={maxTok}
            colour={ACTOR_COLOUR.files!}
            on={hl === "server"}
          />
        ))}
        <Bar
          label="all four, separately"
          value={run.direct_tokens as number}
          max={maxTok}
          colour="#737373"
          on={false}
        />
        <Bar
          label={`merged: ${policy}`}
          value={showMerged ? (run.merged_tokens as number) : 0}
          max={maxTok}
          colour={ACTOR_COLOUR.gateway!}
          on={hl === "sum"}
        />
      </div>
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat
        label="Tools exposed"
        value={showMerged ? String(run.merged_tools) : "…"}
        hint={`of ${rows.length}`}
      />
      <Stat
        label="Tool-list tokens"
        value={showMerged ? fmtInt(run.merged_tokens as number) : "…"}
      />
      <Stat
        label="Name collisions"
        value={String(((run.merge as Obj).collisions as unknown[]).length)}
        hint="read_file, search"
      />
      <Stat
        label="search went to"
        value={
          st.step >=
          frames.findIndex((x) => String(x.label).startsWith("route"))
            ? String(run.routed_to)
            : "…"
        }
        hint={
          st.step < frames.findIndex((x) => String(x.label).startsWith("route"))
            ? "the model meant web"
            : run.routed_right
              ? "as intended"
              : "not web!"
        }
      />
    </div>
  );

  return (
    <AnimationPanel
      testId="gateway-widget"
      title="One gateway, four servers"
      summary="The host lists tools through a gateway, which lists every server and merges their tools; then the model calls web search."
      stepper={st}
      stepLabel="message"
      caption={gatewayCaption(f)}
      visual={visual}
      stats={stats}
      equation={children}
      hl={hl}
      params={
        <Segmented
          label="Naming policy"
          value={policy}
          options={[
            { value: "flat", label: "flat" },
            { value: "prefix", label: "prefix" },
            { value: "filtered", label: "filtered" },
          ]}
          onChange={setPolicy}
        />
      }
    />
  );
}

function Bar({
  label,
  value,
  max,
  colour,
  on,
}: {
  label: string;
  value: number;
  max: number;
  colour: string;
  on: boolean;
}): JSX.Element {
  return (
    <div className="grid grid-cols-[9rem_1fr_3rem] items-center gap-2">
      <span className="truncate font-mono">{label}</span>
      <span className="h-3 rounded bg-neutral-100 dark:bg-neutral-900">
        <span
          className={`block h-3 rounded ${on ? "ring-2 ring-[#0072B2]" : ""}`}
          style={{
            width: `${(100 * value) / Math.max(1, max)}%`,
            background: colour,
          }}
        />
      </span>
      <span className="text-right font-mono">{fmtInt(value)}</span>
    </div>
  );
}
