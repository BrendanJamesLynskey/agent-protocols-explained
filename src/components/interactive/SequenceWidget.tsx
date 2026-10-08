"use client";

/**
 * Chapters 2 and 5: a real MCP session as a message sequence chart. Each arrow is a message
 * the engine's client or server state machine sent (the same messages the official MCP SDK
 * sends, checked in CI); arrows to the user or a model happen inside the host. The current
 * message's JSON is shown in full, and every message of the session can be expanded.
 *
 * - variant "lifecycle" (chapter 2): the start of a session in each era, version and
 *   capability negotiation drawn as two sets intersected, errors, and the engine-only paths
 *   (pagination, cancellation, a list change).
 * - variant "reverse" (chapter 5): the server needs the user (elicitation) or a model
 *   (sampling): a request in the other direction (2025-11-25) or input_required and a retry
 *   (2026-07-28).
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { EngineStatus } from "@/components/agent/EngineStatus";
import { SequenceChart } from "@/components/proto/SequenceChart";
import { Choice, Stat } from "@/components/ui/Controls";
import type { Obj } from "@/lib/engine";
import { sequenceCaption } from "@/lib/proto/captions";
import { fmtInt } from "@/lib/format";

import { useEngine } from "./useEngine";

type Variant = "lifecycle" | "reverse";

const OPTIONS: Record<
  Variant,
  { value: string; label: string; note: string }[]
> = {
  lifecycle: [
    {
      value: "legacy_tour",
      label: "2025-11-25: handshake, then use",
      note: "The handshake era: initialize, the server's answer, notifications/initialized, then requests. Recorded with the official SDK too.",
    },
    {
      value: "auto_tour",
      label: "2026-07-28: discover first",
      note: "The current revision with an up-front server/discover: the client learns the server's versions and capabilities in one request.",
    },
    {
      value: "modern_tour",
      label: "2026-07-28: no handshake",
      note: "The current revision: no handshake at all. Every request carries its version, the client's identity and capabilities in _meta.",
    },
    {
      value: "legacy_progress",
      label: "Progress notifications",
      note: "A long tool call reports progress: notifications tagged with the request's progress token, then the result.",
    },
    {
      value: "raw_old_version",
      label: "An old client (2024-11-05)",
      note: "A client asks for the first revision; the server supports it and agrees.",
    },
    {
      value: "raw_handshake",
      label: "Out of order, unknown version",
      note: "A request before the handshake is refused; an unknown version gets the server's own; a 2026-07-28 request on a handshake connection is refused.",
    },
    {
      value: "raw_errors",
      label: "Malformed, unsupported, unknown",
      note: "A line that is not JSON (the SDK's stdio server says nothing), an unsupported version (-32022), an unknown method (-32601), a request with no _meta (-32602).",
    },
    {
      value: "legacy_errors",
      label: "Tool errors vs protocol errors",
      note: "A tool that fails and an unknown tool are results with isError (the model can read them); an unknown resource is a JSON-RPC error.",
    },
    {
      value: "legacy_paged",
      label: "Pagination (engine only)",
      note: "Engine only (the SDK's fixture server does not paginate): tools/list in pages of two, following nextCursor.",
    },
    {
      value: "legacy_cancel",
      label: "Cancellation (engine only)",
      note: "Engine only: after two progress updates the client sends notifications/cancelled; the server stops and sends no result.",
    },
    {
      value: "legacy_list_changed",
      label: "A list change (engine only)",
      note: "Engine only: the server gains a tool and sends notifications/tools/list_changed; the client lists again and can call it.",
    },
  ],
  reverse: [
    {
      value: "legacy_elicit_accept",
      label: "2025-11-25: elicitation, accept",
      note: "The server sends its own request, elicitation/create, while the tool call waits; the host asks the user, who accepts.",
    },
    {
      value: "legacy_elicit_decline",
      label: "2025-11-25: elicitation, decline",
      note: "The same, and the user declines: the tool keeps the file.",
    },
    {
      value: "modern_elicit_accept",
      label: "2026-07-28: input_required, accept",
      note: "No request from the server: the result is input_required; the host asks the user and retries the call with the answer.",
    },
    {
      value: "modern_elicit_decline",
      label: "2026-07-28: input_required, decline",
      note: "The same, declined.",
    },
    {
      value: "legacy_sampling",
      label: "2025-11-25: sampling",
      note: "The server asks the client's model to write something (sampling/createMessage); the host may show the user first.",
    },
    {
      value: "modern_sampling",
      label: "2026-07-28: sampling (deprecated)",
      note: "Sampling as an input request inside input_required. Deprecated in 2026-07-28: servers should call a model provider themselves.",
    },
  ],
};

export default function SequenceWidget({
  variant,
  children,
}: {
  variant: Variant;
  children?: ReactNode;
}): JSX.Element {
  const engine = useEngine(variant);
  const opts = OPTIONS[variant];
  const [name, setName] = useState<string>(opts[0]!.value);
  const [hover, setHover] = useState<string | null>(null);
  const s = engine.status === "ready" ? engine.data.sessions[name] : undefined;
  const frames = useMemo(() => (s ? s.sequence : []), [s]);
  const st = useStepper(frames.length, {
    stepMs: 1100,
    smooth: true,
    resetKey: name,
  });
  if (engine.status !== "ready" || !s || frames.length === 0)
    return (
      <EngineStatus
        error={engine.status === "error" ? engine.error : undefined}
      />
    );

  const f = frames[st.step]!;
  const msg: Obj | null =
    f.wire === null ? null : (s.wire[f.wire as number]?.msg ?? null);
  const neg = s.negotiation;
  // where the version is settled: the initialize/discover result, or the first request (2026-07-28)
  let negStep = frames.findIndex(
    (x) =>
      !x.virtual &&
      typeof x.label === "string" &&
      (x.label.startsWith("agreed") || x.label.startsWith("speaks")),
  );
  if (negStep < 0) negStep = neg.era === "modern" ? 0 : frames.length;
  const settled = st.step >= negStep;
  let hl = "";
  if (variant === "lifecycle")
    hl = st.step === negStep ? "client server agreed" : "";
  else {
    if (f.virtual) hl = "ask";
    else if (f.kind === "request" && f.from === "server") hl = "ask";
    else if (f.from === "client" && f.kind === "result") hl = "answer";
    else if (typeof f.label === "string" && f.label.includes("+ answers"))
      hl = "retry";
    else if (
      typeof f.label === "string" &&
      f.label.startsWith("input_required")
    )
      hl = "ask";
    else if (f.kind === "request" || f.kind === "result") hl = "call";
  }
  let bytes = 0;
  let msgs = 0;
  for (let i = 0; i <= st.step; i++)
    if (!frames[i]!.virtual) {
      bytes += frames[i]!.bytes as number;
      msgs += 1;
    }
  const note = opts.find((o) => o.value === name)!.note;
  const wireMsgs = frames.filter((x) => !x.virtual);

  const visual = (
    <div className="mx-auto max-w-xl">
      <div className="mb-2 flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-white px-2 py-1 ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800">
          <span className="text-neutral-500 dark:text-neutral-400">
            Client:{" "}
          </span>
          <span className="font-mono" data-testid="client-state">
            {f.client as string}
          </span>
        </span>
        <span className="rounded bg-white px-2 py-1 ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800">
          <span className="text-neutral-500 dark:text-neutral-400">
            Server:{" "}
          </span>
          <span className="font-mono" data-testid="server-state">
            {f.server as string}
          </span>
        </span>
      </div>
      <SequenceChart
        frames={frames}
        step={st.step}
        frac={st.frac}
        label={`Message sequence chart, ${s.title}. Now: ${sequenceCaption(f)}`}
      />
      {variant === "lifecycle" && (
        <Negotiation neg={neg} settled={settled} hover={hover} />
      )}
      <div className="mt-3">
        <p className="text-[0.72rem] text-neutral-600 dark:text-neutral-400">
          {msg === null
            ? f.virtual
              ? "Inside the host: not a protocol message"
              : "The line as sent (not JSON)"
            : `Message ${st.step + 1}, as sent (${fmtInt(f.bytes as number)} bytes of JSON)`}
        </p>
        <pre
          tabIndex={0}
          role="region"
          aria-label="The current message"
          data-testid="message-json"
          className="focus-ring mt-1 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded bg-white p-2 font-mono text-[0.72rem] text-neutral-800 ring-1 ring-neutral-200 dark:bg-neutral-950 dark:text-neutral-200 dark:ring-neutral-800"
        >
          {msg !== null
            ? JSON.stringify(msg, null, 2)
            : f.virtual
              ? f.label
              : (s.wire[f.wire as number]?.raw ?? "")}
        </pre>
      </div>
      <details className="mt-2 text-xs" data-testid="all-messages">
        <summary className="focus-ring min-h-11 cursor-pointer py-2 text-neutral-700 dark:text-neutral-300">
          Every message of this session ({wireMsgs.length})
        </summary>
        <ol className="mt-1 space-y-1">
          {wireMsgs.map((x) => {
            const w = s.wire[x.wire as number]!;
            return (
              <li key={x.step as number}>
                <details>
                  <summary className="focus-ring min-h-11 cursor-pointer py-2 font-mono">
                    {(x.wire as number) + 1}. {x.dir === "c2s" ? "→" : "←"}{" "}
                    {x.label as string}
                  </summary>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-white p-2 font-mono text-[0.7rem] ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800">
                    {w.msg ? JSON.stringify(w.msg, null, 2) : w.raw}
                  </pre>
                </details>
              </li>
            );
          })}
        </ol>
      </details>
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat label="Messages" value={`${msgs}/${wireMsgs.length}`} />
      <Stat label="Bytes of JSON" value={fmtInt(bytes)} hint="so far" />
      <Stat label="Version" value={settled ? String(neg.agreed) : "–"} />
      <Stat
        label="Era"
        value={neg.era === "modern" ? "2026-07-28" : "handshake"}
      />
    </div>
  );

  return (
    <AnimationPanel
      testId={`sequence-${variant}`}
      title={
        variant === "lifecycle"
          ? "A session, message by message"
          : "When the server needs the user or a model"
      }
      summary={note}
      stepper={st}
      stepLabel="message"
      caption={sequenceCaption(f)}
      visual={visual}
      stats={stats}
      equation={children}
      hl={hover ?? hl}
      onEquationHover={setHover}
      params={
        <Choice
          label="Session"
          value={name}
          options={opts.map((o) => ({ value: o.value, label: o.label }))}
          onChange={setName}
        />
      }
    />
  );
}

function Negotiation({
  neg,
  settled,
  hover,
}: {
  neg: Obj;
  settled: boolean;
  hover: string | null;
}): JSX.Element {
  const both = new Set(neg.both as string[]);
  const chip = (v: string, side: "client" | "server") => {
    const inBoth = both.has(v);
    const agreed = settled && v === neg.agreed;
    return (
      <span
        key={`${side}-${v}`}
        data-version={v}
        data-agreed={agreed ? "true" : "false"}
        className={`rounded px-1.5 py-0.5 font-mono text-[0.7rem] ring-1 ${
          agreed
            ? "bg-accent text-accent-fg ring-accent"
            : inBoth && settled
              ? "text-neutral-900 ring-2 ring-[#0072B2] dark:text-neutral-100"
              : "text-neutral-600 ring-neutral-300 dark:text-neutral-400 dark:ring-neutral-700"
        }`}
      >
        {v}
        {agreed ? " ✓" : ""}
      </span>
    );
  };
  const ring = (k: string) =>
    hover === k
      ? "ring-2 ring-[#0072B2]"
      : "ring-1 ring-neutral-200 dark:ring-neutral-800";
  return (
    <div
      className={`mt-3 grid gap-2 text-xs sm:grid-cols-2 ${settled ? "" : "opacity-60"}`}
      data-testid="negotiation"
      data-settled={settled ? "true" : "false"}
    >
      <div
        className={`rounded bg-white p-2 dark:bg-neutral-950 ${ring("client")}`}
      >
        <p className="mb-1 text-neutral-600 dark:text-neutral-400">
          Versions the client speaks (V<sub>c</sub>)
        </p>
        <div className="flex flex-wrap gap-1">
          {(neg.client_versions as string[]).map((v) => chip(v, "client"))}
        </div>
      </div>
      <div
        className={`rounded bg-white p-2 dark:bg-neutral-950 ${ring("server")}`}
      >
        <p className="mb-1 text-neutral-600 dark:text-neutral-400">
          Versions the server speaks (V<sub>s</sub>)
        </p>
        <div className="flex flex-wrap gap-1">
          {(neg.server_versions as string[]).map((v) => chip(v, "server"))}
        </div>
      </div>
      <div className="overflow-x-auto rounded bg-white p-2 ring-1 ring-neutral-200 sm:col-span-2 dark:bg-neutral-950 dark:ring-neutral-800">
        <table className="w-full text-left">
          <caption className="mb-1 text-left text-neutral-600 dark:text-neutral-400">
            Capabilities: a feature works only if the side that provides it
            declared it
          </caption>
          <thead>
            <tr className="text-neutral-600 dark:text-neutral-400">
              <th scope="col" className="pr-2 font-normal">
                Feature
              </th>
              <th scope="col" className="pr-2 font-normal">
                Provided by
              </th>
              <th scope="col" className="pr-2 font-normal">
                Declared
              </th>
              <th scope="col" className="font-normal">
                Usable
              </th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {(neg.features as Obj[]).map((r) => (
              <tr key={r.feature as string}>
                <td className="pr-2">{r.feature as string}</td>
                <td className="pr-2">{r.provided_by as string}</td>
                <td className="pr-2">
                  {(r.provided_by === "server" ? r.server : r.client)
                    ? "yes"
                    : "no"}
                </td>
                <td>
                  {!settled
                    ? "…"
                    : r.usable === null
                      ? "ask and see"
                      : r.usable
                        ? "yes"
                        : "no"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
