"use client";

/**
 * Chapter 8: agent to agent. An orchestrating agent delegates to a remote research agent over
 * A2A 1.0 (engine `a2a.play`, the same messages the official A2A SDK's agent sends, checked in
 * CI). The sequence chart runs between the two agents (and the user, when the remote agent needs
 * them to sign in); the task's state machine lights up as the orchestrator learns each state;
 * the agent card appears once it has been read. Streamed events are dashed.
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { EngineStatus } from "@/components/agent/EngineStatus";
import { SequenceChart } from "@/components/proto/SequenceChart";
import { Choice, Stat } from "@/components/ui/Controls";
import { useSvgFont } from "@/components/viz/useSvgFont";
import type { Obj } from "@/lib/engine";
import { fmtInt, fmtMs } from "@/lib/format";
import { a2aCaption } from "@/lib/proto/captions";
import { A2A_NAMES, MUTED, STATE_COLOUR } from "@/lib/viz/palette";

import { useEngine } from "./useEngine";

const OPTIONS: { value: string; label: string; note: string }[] = [
  {
    value: "a2a_stream",
    label: "Delegate and stream",
    note: "SendStreamingMessage: the task, its status updates and its artifact in two chunks arrive as SSE events; the stream closes on a terminal state.",
  },
  {
    value: "a2a_send",
    label: "Delegate and wait",
    note: "SendMessage blocks until the task is done: the orchestrator only ever sees the final state. Then GetTask reads it again.",
  },
  {
    value: "a2a_input",
    label: "Input required",
    note: "An ambiguous request: the task pauses in input required with a question; the orchestrator answers in the same task (taskId and contextId).",
  },
  {
    value: "a2a_auth",
    label: "Auth required",
    note: "The remote agent needs the user's calendar: auth required; the user signs in outside A2A, and the orchestrator tells the agent.",
  },
  {
    value: "a2a_cancel",
    label: "Cancel, then too late",
    note: "The orchestrator cancels a paused task; cancelling again (-32002), answering it (-32004) and subscribing to it (-32004) all fail on a finished task.",
  },
  {
    value: "a2a_reject",
    label: "Rejected",
    note: "The remote agent declines the task outright: rejected is a terminal state, with a message saying why.",
  },
  {
    value: "a2a_message",
    label: "A message, no task",
    note: "For a trivial request the agent may answer with a Message instead of a Task: nothing to track.",
  },
  {
    value: "a2a_errors",
    label: "Errors",
    note: "No such task (-32001), no A2A-Version header so 0.3 is assumed (-32009), the 0.3 method name message/send (-32601), no parts (-32602), no extended card (-32004).",
  },
];

const W = 360;
const NODE: [number, number] = [98, 22];
const SPOT: Record<string, [number, number]> = {
  TASK_STATE_SUBMITTED: [54, 70],
  TASK_STATE_INPUT_REQUIRED: [176, 22],
  TASK_STATE_WORKING: [176, 70],
  TASK_STATE_AUTH_REQUIRED: [176, 118],
  TASK_STATE_COMPLETED: [303, 16],
  TASK_STATE_FAILED: [303, 52],
  TASK_STATE_CANCELED: [303, 88],
  TASK_STATE_REJECTED: [303, 124],
};

const short = (s: string) =>
  s.replace("TASK_STATE_", "").toLowerCase().replaceAll("_", " ");

export default function A2AWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const engine = useEngine("a2a");
  const [name, setName] = useState<string>(OPTIONS[0]!.value);
  const s = engine.status === "ready" ? engine.data.a2a?.[name] : undefined;
  const frames = useMemo(() => (s ? s.frames : []), [s]);
  const st = useStepper(frames.length, {
    stepMs: 1100,
    smooth: true,
    resetKey: name,
  });
  const font = useSvgFont(W);
  if (
    engine.status !== "ready" ||
    !s ||
    frames.length === 0 ||
    !engine.data.taskStates
  )
    return (
      <EngineStatus
        error={engine.status === "error" ? engine.error : undefined}
      />
    );

  const fs = font.fs;
  const f = frames[st.step]!;
  const { states, transitions } = engine.data.taskStates;
  // the states the orchestrator has seen so far, in order
  const seen: string[] = [];
  for (let i = 0; i <= st.step; i++) {
    const t = frames[i]!.task as string | null;
    if (t && seen[seen.length - 1] !== t) seen.push(t);
  }
  const now = seen[seen.length - 1] ?? null;
  const prev = seen.length > 1 ? seen[seen.length - 2]! : null;
  const justMoved =
    st.step > 0 && frames[st.step - 1]!.task !== f.task && prev !== null;
  const hasUser = frames.some((x) => x.from === "user" || x.to === "user");
  const actors = hasUser ? ["client", "server", "user"] : ["client", "server"];
  const w = f.wire === null ? null : (s.wire[f.wire as number] as Obj);
  const body =
    w === null
      ? null
      : "http" in w
        ? (w.http.body ?? { GET: w.http.url })
        : w.msg;
  const cardRead = frames.findIndex(
    (x) => x.dir === "s2c" && String(x.label).startsWith("agent card"),
  );
  const card = s.card as Obj | null;
  let bytes = 0;
  let msgs = 0;
  for (let i = 0; i <= st.step; i++)
    if (!frames[i]!.virtual) {
      bytes += frames[i]!.bytes as number;
      msgs += 1;
    }
  const sum = s.summary as Obj;
  let hl = "";
  if (f.sse) hl = "stream";
  else if (f.dir === "s2c" && String(f.label).startsWith("Task")) hl = "block";
  const note = OPTIONS.find((o) => o.value === name)!.note;

  const visual = (
    <div className="mx-auto max-w-xl">
      {card && cardRead >= 0 && st.step >= cardRead && (
        <div
          data-testid="agent-card"
          className="mb-2 rounded bg-white p-2 text-[0.72rem] ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800"
        >
          <span className="font-semibold">{card.name as string}</span>{" "}
          <span className="text-neutral-600 dark:text-neutral-400">
            · {card.binding as string} {card.version as string} · skills:{" "}
            {(card.skills as string[]).join(", ")}
            {card.streaming ? " · streams" : ""}
          </span>
        </div>
      )}
      <SequenceChart
        frames={frames}
        step={st.step}
        frac={st.frac}
        rows={9}
        actors={actors}
        names={A2A_NAMES}
        label={`Sequence chart between two agents, ${s.title}. Now: ${a2aCaption(f)}`}
      />
      <svg
        ref={font.ref}
        viewBox={`0 0 ${W} 140`}
        className="mt-2 h-auto w-full"
        role="img"
        aria-label={`The task's life cycle. ${now ? `Now: ${short(now)}.` : "No task yet."}`}
        data-testid="task-states"
        data-state={now ?? "none"}
      >
        <defs>
          <marker
            id="ts-arrow"
            viewBox="0 0 8 8"
            refX={7}
            refY={4}
            markerWidth={5}
            markerHeight={5}
            orient="auto-start-reverse"
          >
            <path d="M0 0 L8 4 L0 8 z" fill="#a3a3a3" />
          </marker>
          <marker
            id="ts-arrow-on"
            viewBox="0 0 8 8"
            refX={7}
            refY={4}
            markerWidth={5}
            markerHeight={5}
            orient="auto-start-reverse"
          >
            <path d="M0 0 L8 4 L0 8 z" fill={STATE_COLOUR.active} />
          </marker>
        </defs>
        {transitions.map(([a, b]) => {
          const [x1, y1] = SPOT[a!]!;
          const [x2, y2] = SPOT[b!]!;
          const on = justMoved && prev === a && now === b;
          const dx = x2 - x1;
          const dy = y2 - y1;
          // start and end at the boxes' edges
          const ex = (NODE[0] / 2) * Math.sign(dx);
          const sx = Math.abs(dx) < 1 ? 0 : ex;
          const sy = Math.abs(dx) < 1 ? (NODE[1] / 2) * Math.sign(dy) : 0;
          return (
            <line
              key={`${a}-${b}`}
              x1={x1 + sx}
              y1={y1 + sy}
              x2={x2 - sx}
              y2={y2 - sy}
              stroke={on ? STATE_COLOUR.active : "#a3a3a3"}
              strokeWidth={on ? 2.2 : 0.9}
              markerEnd={`url(#${on ? "ts-arrow-on" : "ts-arrow"})`}
              data-edge={`${short(a!)}->${short(b!)}`}
              data-active={on ? "true" : "false"}
            />
          );
        })}
        {states.map((x) => {
          const [cx, cy] = SPOT[x]!;
          const isNow = x === now;
          const visited = seen.includes(x);
          const terminal = cx > 250;
          return (
            <g
              key={x}
              data-state-node={x}
              data-now={isNow ? "true" : "false"}
              data-visited={visited ? "true" : "false"}
            >
              <rect
                x={cx - NODE[0] / 2}
                y={cy - NODE[1] / 2}
                width={NODE[0]}
                height={NODE[1]}
                rx={terminal ? 2 : 11}
                className={isNow ? "" : "fill-white dark:fill-neutral-950"}
                fill={isNow ? STATE_COLOUR.active : undefined}
                stroke={
                  isNow
                    ? STATE_COLOUR.active
                    : visited
                      ? "#525252"
                      : MUTED.light
                }
                strokeWidth={isNow ? 2 : visited ? 1.6 : 1}
                strokeDasharray={visited || isNow ? undefined : "3 2"}
              />
              <text
                x={cx}
                y={cy + 3.5}
                textAnchor="middle"
                style={{ fontSize: fs(9.5) }}
                className={
                  isNow
                    ? "fill-white font-semibold"
                    : "fill-neutral-800 dark:fill-neutral-200"
                }
              >
                {short(x)}
                {visited && !isNow ? " ✓" : ""}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2">
        <p className="text-[0.72rem] text-neutral-600 dark:text-neutral-400">
          {body === null
            ? "Outside A2A: not a protocol message"
            : `Message ${st.step + 1}, as sent${f.sse ? " (one SSE event)" : ""}`}
        </p>
        <pre
          tabIndex={0}
          role="region"
          aria-label="The current message"
          data-testid="message-json"
          className="focus-ring mt-1 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-2 font-mono text-[0.72rem] text-neutral-800 ring-1 ring-neutral-200 dark:bg-neutral-950 dark:text-neutral-200 dark:ring-neutral-800"
        >
          {body === null ? String(f.label) : JSON.stringify(body, null, 2)}
        </pre>
      </div>
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat
        label="Messages"
        value={`${msgs}/${frames.filter((x) => !x.virtual).length}`}
      />
      <Stat label="Bytes" value={fmtInt(bytes)} hint="so far" />
      <Stat
        label="Time"
        value={fmtMs(f.t as number)}
        hint={
          sum.first_result_ms !== null
            ? `result from ${fmtMs(sum.first_result_ms as number)}`
            : "no result"
        }
      />
      <Stat label="Task" value={now ? short(now) : "–"} />
    </div>
  );

  return (
    <AnimationPanel
      testId="a2a-widget"
      title="Two agents, one task"
      summary={note}
      stepper={st}
      stepLabel="message"
      caption={a2aCaption(f)}
      visual={visual}
      stats={stats}
      equation={children}
      hl={hl}
      params={
        <Choice
          label="Session"
          value={name}
          options={OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          onChange={setName}
        />
      }
    />
  );
}
