"use client";

/**
 * Chapters 6 and 9: a step-by-step flow as a sequence chart, every step computed by the engine.
 *
 * - variant "oauth" (chapter 6): the OAuth 2.1 flow MCP 2026-07-28 requires (`runOauth`), with a
 *   "break it" choice of mis-configurations, each failing at the check the spec puts there. The
 *   PKCE pair (real SHA-256) and the token's claims are shown beside the chart.
 * - variant "security" (chapter 9): three attacks (`runSecurity`), each with its defence off or
 *   on; the attack step and the check that stops it are marked on the chart.
 *
 * Checks, user actions and attack steps happen at one actor or off the wire: they are drawn on
 * the lifeline, not as arrows.
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { EngineStatus } from "@/components/agent/EngineStatus";
import { SequenceChart } from "@/components/proto/SequenceChart";
import { Choice, Segmented, Stat } from "@/components/ui/Controls";
import type { Obj } from "@/lib/engine";
import { flowCaption } from "@/lib/proto/captions";

import { useEngine } from "./useEngine";

type Variant = "oauth" | "security";

const ORDER = [
  "user",
  "browser",
  "attacker",
  "model",
  "client",
  "proxy",
  "mcp",
  "notes",
  "files",
  "server",
  "as",
  "upstream",
];

const OAUTH_LABELS: Record<string, string> = {
  ok: "Configured correctly",
  dcr: "Dynamic Client Registration",
  no_pkce_support: "Break it: AS without PKCE",
  pkce_skipped: "Break it: PKCE left out",
  wrong_verifier: "Break it: wrong verifier",
  issuer_mismatch: "Break it: issuer mismatch",
  iss_mismatch: "Break it: iss mix-up",
  wrong_audience: "Break it: wrong audience",
  insufficient_scope: "Break it: scope too narrow",
  token_passthrough: "Break it: token passthrough",
};

const ATTACK_LABELS: Record<string, string> = {
  tool_poisoning: "Tool poisoning (a rug pull)",
  confused_deputy: "Confused deputy (OAuth proxy)",
  state_handle: "State handle hijacking",
};

function pretty(body: unknown): string {
  if (body === null || body === undefined) return "";
  if (typeof body === "string") {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return JSON.stringify(body, null, 2);
}

export default function FlowWidget({
  variant,
  children,
}: {
  variant: Variant;
  children?: ReactNode;
}): JSX.Element {
  const engine = useEngine(variant);
  const [name, setName] = useState<string>(
    variant === "oauth" ? "ok" : "tool_poisoning",
  );
  const [defence, setDefence] = useState<"off" | "on">("off");
  const key =
    variant === "oauth"
      ? name
      : `${name}-${defence === "on" ? "defended" : "open"}`;
  const run = engine.status === "ready" ? engine.data.flows?.[key] : undefined;
  const frames = useMemo(() => (run ? (run.frames as Obj[]) : []), [run]);
  const st = useStepper(frames.length, {
    stepMs: 1100,
    smooth: true,
    resetKey: key,
  });
  if (engine.status !== "ready" || !run || frames.length === 0)
    return (
      <EngineStatus
        error={engine.status === "error" ? engine.error : undefined}
      />
    );

  const f = frames[st.step]!;
  const s = (run.steps as Obj[])[f.seq as number]!;
  const present = new Set<string>();
  for (const x of frames) {
    present.add(x.from as string);
    present.add(x.to as string);
  }
  const actors = ORDER.filter((a) => present.has(a));
  const last = st.step === frames.length - 1;
  const outcome = run.outcome as Obj;
  const label = String(f.label);

  let hl = "";
  if (variant === "oauth") {
    if (label.includes("PKCE") || label.includes("SHA-256")) hl = "challenge";
    else if (label.includes("verifier")) hl = "verifier";
    else if (label.includes("audience") || label.includes("bearer token"))
      hl = "aud";
  } else {
    if (f.kind === "attack") hl = "attack";
    else if (f.kind === "fail") hl = "defence";
  }

  const pkce = run.pkce as Obj | null;
  // shown once the flow has made them
  const pkceStep = frames.findIndex((x) =>
    String(x.label).startsWith("make the PKCE pair"),
  );
  const tokenStep = frames.findIndex((x) =>
    String(x.label).startsWith("200 access token"),
  );
  const token = run.token as Obj | null;
  const banner =
    variant === "oauth"
      ? outcome.ok
        ? "Authorised: the MCP server accepted the token."
        : `Stopped at step ${(outcome.failed_at as number) + 1}: ${outcome.reason}.`
      : outcome.harm
        ? `Harm done: ${outcome.reason}.`
        : `Stopped at step ${(outcome.stopped_at as number) + 1}: ${outcome.reason}.`;
  const good = variant === "oauth" ? Boolean(outcome.ok) : !outcome.harm;

  const visual = (
    <div className="mx-auto max-w-xl">
      <SequenceChart
        frames={frames}
        step={st.step}
        frac={st.frac}
        rows={10}
        actors={actors}
        label={`Sequence chart, ${run.title as string}. Now: ${flowCaption(f)}`}
      />
      <p
        data-testid="flow-outcome"
        data-good={good ? "true" : "false"}
        className={`mt-2 rounded px-2 py-1 text-xs ring-1 ${
          !last
            ? "text-neutral-600 ring-neutral-200 dark:text-neutral-400 dark:ring-neutral-800"
            : good
              ? "font-medium text-neutral-900 ring-2 ring-[#009E73] dark:text-neutral-100"
              : "font-medium text-neutral-900 ring-2 ring-[#D55E00] dark:text-neutral-100"
        }`}
      >
        {last
          ? (good ? "✓ " : "✕ ") + banner
          : `Step ${st.step + 1} of ${frames.length}; the outcome shows at the last step.`}
      </p>
      <div className="mt-3 text-xs">
        <p className="text-neutral-600 dark:text-neutral-400">
          Step {st.step + 1}:{" "}
          {s.kind === "http"
            ? s.status === null
              ? "the request"
              : `the response (${s.status as number})`
            : s.kind === "check"
              ? "a check"
              : s.kind === "attack"
                ? "the attack"
                : "off the wire"}
        </p>
        <pre
          tabIndex={0}
          role="region"
          aria-label="The current step"
          data-testid="flow-step"
          className="focus-ring mt-1 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded bg-white p-2 font-mono text-[0.72rem] text-neutral-800 ring-1 ring-neutral-200 dark:bg-neutral-950 dark:text-neutral-200 dark:ring-neutral-800"
        >
          {s.kind === "http"
            ? [
                s.method
                  ? `${s.method as string} ${s.url as string}`
                  : s.status === null
                    ? `open in the browser: ${s.url as string}`
                    : `HTTP ${s.status as number}`,
                ...((s.headers as string[][]) ?? []).map(
                  ([k, v]) => `${k}: ${v}`,
                ),
                s.body !== null && s.body !== undefined
                  ? "\n" + pretty(s.body)
                  : "",
                s.note ? `\n# ${s.note as string}` : "",
              ]
                .filter((x) => x !== "")
                .join("\n")
            : [
                s.label,
                s.detail ? `\n${s.detail as string}` : "",
                s.rule ? `\nRule: ${s.rule as string}` : "",
              ]
                .filter((x) => x !== "")
                .join("")}
        </pre>
      </div>
      {variant === "oauth" && pkce && st.step >= pkceStep && (
        <div
          data-testid="pkce"
          className={`mt-3 grid gap-1 rounded bg-white p-2 text-[0.72rem] dark:bg-neutral-950 ${
            hl === "challenge" || hl === "verifier"
              ? "ring-2 ring-[#0072B2]"
              : "ring-1 ring-neutral-200 dark:ring-neutral-800"
          }`}
        >
          <p className="text-neutral-600 dark:text-neutral-400">
            PKCE, computed by the engine (real SHA-256)
          </p>
          <p className="break-all font-mono">
            verifier: {pkce.verifier as string}
          </p>
          <p className="break-all font-mono">
            SHA-256: {pkce.sha256_hex as string}
          </p>
          <p className="break-all font-mono">
            challenge: {pkce.challenge as string}
          </p>
        </div>
      )}
      {variant === "oauth" && token && st.step >= tokenStep && (
        <div
          data-testid="token"
          className={`mt-2 rounded bg-white p-2 text-[0.72rem] dark:bg-neutral-950 ${
            hl === "aud"
              ? "ring-2 ring-[#0072B2]"
              : "ring-1 ring-neutral-200 dark:ring-neutral-800"
          }`}
        >
          <p className="text-neutral-600 dark:text-neutral-400">
            The token&apos;s claims
            {token.presented ? " (and the token presented instead)" : ""}
          </p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono">
            {JSON.stringify(
              token.presented
                ? {
                    issued: token.claims,
                    presented: (token.presented as Obj).claims,
                  }
                : token.claims,
              null,
              2,
            )}
          </pre>
        </div>
      )}
    </div>
  );

  const stats = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat label="Step" value={`${st.step + 1}/${frames.length}`} />
      <Stat
        label="HTTP messages"
        value={String(
          frames.slice(0, st.step + 1).filter((x) => !x.virtual).length,
        )}
        hint="so far"
      />
      <Stat
        label="Checks"
        value={String(
          frames
            .slice(0, st.step + 1)
            .filter((x) => x.kind === "check" || x.kind === "fail").length,
        )}
        hint="so far"
      />
      <Stat
        label={variant === "oauth" ? "Outcome" : "Harm"}
        value={
          !last
            ? "…"
            : variant === "oauth"
              ? outcome.ok
                ? "authorised"
                : "stopped"
              : outcome.harm
                ? "yes"
                : "no"
        }
      />
    </div>
  );

  const params =
    variant === "oauth" ? (
      <Choice
        label="Configuration"
        value={name}
        options={Object.keys(OAUTH_LABELS).map((v) => ({
          value: v,
          label: OAUTH_LABELS[v]!,
        }))}
        onChange={setName}
      />
    ) : (
      <div className="grid gap-3 sm:grid-cols-2">
        <Choice
          label="Attack"
          value={name}
          options={Object.keys(ATTACK_LABELS).map((v) => ({
            value: v,
            label: ATTACK_LABELS[v]!,
          }))}
          onChange={setName}
        />
        <Segmented
          label="Defence"
          value={defence}
          options={[
            { value: "off", label: "off" },
            { value: "on", label: "on" },
          ]}
          onChange={setDefence}
        />
      </div>
    );

  return (
    <AnimationPanel
      testId={`flow-${variant}`}
      title={
        variant === "oauth"
          ? "The OAuth 2.1 dance, step by step"
          : "An attack, and where its defence stops it"
      }
      summary={run.title as string}
      stepper={st}
      stepLabel="step"
      caption={flowCaption(f)}
      visual={visual}
      stats={stats}
      equation={children}
      hl={hl}
      params={params}
    />
  );
}
