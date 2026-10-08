"use client";

/**
 * Chapter 3: the same README reaches the model three ways in one session. As a tool the model
 * chooses to call (tools/list, tools/call); as a resource the application attaches
 * (resources/list, resources/read); as a prompt the user picks (prompts/list, prompts/get).
 * The chart is the engine's session (equal to the official SDK's); the cards count each
 * path's messages, bytes and the tokens that land in the model's context (Qwen2.5 tokenizer).
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { EngineStatus } from "@/components/agent/EngineStatus";
import { SequenceChart } from "@/components/proto/SequenceChart";
import { Segmented, Stat } from "@/components/ui/Controls";
import type { Obj } from "@/lib/engine";
import { sequenceCaption } from "@/lib/proto/captions";
import { fmtInt } from "@/lib/format";
import { STATE_COLOUR } from "@/lib/viz/palette";

import { useEngine } from "./useEngine";

const ERAS = [
  { value: "legacy_three_ways", label: "2025-11-25" },
  { value: "modern_three_ways", label: "2026-07-28" },
] as const;
type Era = (typeof ERAS)[number]["value"];

const WHO: Record<string, string> = {
  model: "the model decides",
  application: "the application decides",
  user: "the user decides",
};
const HL: Record<string, string> = {
  tool: "tool",
  resource: "resource",
  prompt: "prompt",
};

export default function ThreeWaysWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const engine = useEngine("primitives");
  const [era, setEra] = useState<Era>("legacy_three_ways");
  const [hover, setHover] = useState<string | null>(null);
  const s = engine.status === "ready" ? engine.data.sessions[era] : undefined;
  const rows =
    engine.status === "ready" ? (engine.data.threeWays?.[era] ?? []) : [];
  const frames = useMemo(() => (s ? s.sequence : []), [s]);
  const st = useStepper(frames.length, {
    stepMs: 1000,
    smooth: true,
    resetKey: era,
  });
  if (engine.status !== "ready" || !s || frames.length === 0)
    return (
      <EngineStatus
        error={engine.status === "error" ? engine.error : undefined}
      />
    );
  const f = frames[st.step]!;
  const active = rows.find((r) =>
    (r.messages as number[]).includes(f.wire as number),
  );
  const hl = active ? HL[active.primitive as string]! : "";
  const focus = hover ?? hl;

  const visual = (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        {rows.map((r: Obj) => {
          const on = r === active || focus === HL[r.primitive as string];
          const done = (r.messages as number[]).every((i) => {
            const k = frames.findIndex((x) => x.wire === i);
            return k >= 0 && k <= st.step;
          });
          return (
            <div
              key={r.primitive as string}
              data-path={r.primitive as string}
              data-active={on ? "true" : "false"}
              className="rounded bg-white p-2 text-xs ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800"
              style={
                on
                  ? { boxShadow: `0 0 0 3px ${STATE_COLOUR.active}` }
                  : undefined
              }
            >
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                <span className="capitalize">{r.primitive as string}</span>{" "}
                <span className="font-mono font-normal text-neutral-600 dark:text-neutral-400">
                  {r.method as string}
                </span>
              </p>
              <p className="text-neutral-700 dark:text-neutral-300">
                {WHO[r.controlled_by as string]}
              </p>
              <p className="mt-1 font-mono text-neutral-700 dark:text-neutral-300">
                {(r.messages as number[]).length} messages ·{" "}
                {fmtInt(r.bytes as number)} B
              </p>
              <p className="font-mono text-neutral-700 dark:text-neutral-300">
                {done ? `${r.tokens as number} tokens into the context` : "…"}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mx-auto max-w-xl">
        <SequenceChart
          frames={frames}
          step={st.step}
          frac={st.frac}
          rows={8}
          label={`The README three ways: message sequence. Now: ${sequenceCaption(f)}`}
        />
      </div>
      <p className="mt-2 text-[0.72rem] text-neutral-600 dark:text-neutral-400">
        {active
          ? `What the ${active.primitive as string} path puts in front of the model`
          : "Listing what the server offers"}
      </p>
      <pre
        tabIndex={0}
        role="region"
        aria-label="What lands in the context"
        className="focus-ring mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-2 font-mono text-[0.72rem] text-neutral-800 ring-1 ring-neutral-200 dark:bg-neutral-950 dark:text-neutral-200 dark:ring-neutral-800"
      >
        {active ? (active.text as string) : "(nothing yet)"}
      </pre>
    </div>
  );

  return (
    <AnimationPanel
      testId="three-ways-widget"
      title="The same document, three ways"
      summary="Tools, resources and prompts differ in who decides to use them. Each path is a list then a get; the chart is the engine's session, equal to the official SDK's."
      stepper={st}
      stepLabel="message"
      caption={`${active ? `[${active.primitive as string}] ` : ""}${sequenceCaption(f)}`}
      visual={visual}
      equation={children}
      hl={focus}
      onEquationHover={setHover}
      stats={
        <div className="grid grid-cols-3 gap-2">
          {rows.map((r: Obj) => (
            <Stat
              key={r.primitive as string}
              label={r.primitive as string}
              value={`${fmtInt(r.bytes as number)} B`}
              hint={`${r.tokens as number} tokens of content`}
            />
          ))}
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
