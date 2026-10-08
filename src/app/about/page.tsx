/**
 * /about: what the site is, what the engine computes and what it leaves out, how the
 * animations are driven and checked, and where the design came from. Server Component, static.
 */
import Link from "next/link";

import { formatValue, lookup } from "@/lib/proto/values";
import VENDORED from "@/lib/engine/vendor/VENDORED.json";
import {
  AGENTS_HUB,
  DECODER_URL,
  ENGINE_URL,
  GITHUB_URL,
  HARNESSES_URL,
  INFERENCE_URL,
  MCP_HUB,
  OAUTH_FOR_MCP,
  SDK_URL,
  A2A_SDK_URL,
  SPEC_URL,
  TRADEOFFS_URL,
  repoFile,
} from "@/lib/site";

export const metadata = {
  title: "About",
  description:
    "What Agent Protocols Explained's engine simulates, what is illustrative, and how the protocol state machines are checked against the official MCP and A2A SDKs.",
};

const A =
  "focus-ring rounded text-accent underline underline-offset-2 dark:text-indigo-300";

export default function AboutPage(): JSX.Element {
  const v = (path: string, fmt: Parameters<typeof formatValue>[1]) =>
    formatValue(lookup(path), fmt);
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-accent dark:text-indigo-300">
        /about
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        About this site
      </h1>
      <div className="mdx-content mt-6">
        <p>
          Agent Protocols Explained follows how agents talk to tools at the
          level of messages on the wire: why a protocol, JSON-RPC and the life
          cycle of a session, tools, resources and prompts, transports, and the
          server asking the user or a model. Every chapter is built around an
          animation. It is the second of a family of agent sites, after{" "}
          <a href={HARNESSES_URL} className={A}>
            Agent Harnesses Explained
          </a>
          , next to the LLM-systems sites (the{" "}
          <a href={DECODER_URL} className={A}>
            Transformer Decoder Explainer
          </a>
          ,{" "}
          <a href={INFERENCE_URL} className={A}>
            LLM Inference Explained
          </a>
          ,{" "}
          <a href={TRADEOFFS_URL} className={A}>
            Inference Trade-offs Explained
          </a>{" "}
          and others, all in the header&apos;s switch).
        </p>

        <h2>The protocol revision</h2>
        <p>
          The site describes MCP revision{" "}
          <a href={SPEC_URL} className={A}>
            {v("spec.current", "raw")}
          </a>
          , the current one on the specification&apos;s versioning page when it
          was written (accessed {v("spec.accessed", "raw")}), and the handshake
          era it replaced (2024-11-05 to 2025-11-25). Where the two differ,
          every animation can show both.
        </p>

        <h2>The engine</h2>
        <p>
          Every animation is a run of{" "}
          <a href={ENGINE_URL} className={A}>
            Agent_Loop_Sim
          </a>
          &apos;s protocols module, vendored into this site at commit{" "}
          <code>{VENDORED.commit.slice(0, 7)}</code> (
          <a
            href={repoFile("src/lib/engine/vendor/VENDORED.json")}
            className={A}
          >
            VENDORED.json
          </a>{" "}
          records each file&apos;s SHA-256). Its Python reference and the
          TypeScript port the site runs produce the same messages and frames;
          the site&apos;s CI regenerates its fixtures from the Python reference
          installed at that commit and requires the port to match them. It has:
        </p>
        <ul>
          <li>
            an MCP <strong>client and server as state machines</strong> over
            JSON-RPC 2.0, in both eras: the handshake and capability
            negotiation, tools, resources and prompts, progress, errors,
            elicitation and sampling (requests from the server, or{" "}
            <code>input_required</code> and a retry), plus pagination,
            cancellation and list changes;
          </li>
          <li>
            <strong>transports</strong>: stdio and Streamable HTTP framing, byte
            for byte for a minimal header set, a latency model, and a broken SSE
            stream resumed or sent again;
          </li>
          <li>
            <strong>authorisation</strong>: the OAuth 2.1 flow MCP requires, as
            a state machine with mis-configured variants (chapter 6);
          </li>
          <li>
            <strong>A2A</strong> 1.0 (since engine 1.3.0): an orchestrating
            agent and a remote research agent over the JSON-RPC binding with
            SSE, the agent card, the task life cycle, multi-turn input, in-task
            authorisation, cancellation and the error codes (chapter 8);
          </li>
          <li>
            an MCP <strong>gateway</strong> over four servers with three naming
            policies, and three <strong>attacks</strong> with and without their
            defences (chapters 7 and 9).
          </li>
        </ul>

        <h2>Checked against the official SDK</h2>
        <p>
          The protocol is not modelled from the specification alone. A small
          server written with the{" "}
          <a href={SDK_URL} className={A}>
            official MCP Python SDK
          </a>{" "}
          ({v("sdk.version", "raw")}) and the SDK&apos;s own client play{" "}
          {v("sdk.scenarios", "int")} sessions over stdio while a tee records
          every line; the engine must produce the same{" "}
          {v("sdk.messages", "int")} messages, compared as JSON with request IDs
          renumbered. The engine&apos;s CI re-records the SDK live on every
          change. The{" "}
          <Link href="/conformance" className={A}>
            conformance page
          </Link>{" "}
          shows the recordings.
        </p>
        <p>
          A2A is checked the same way: an agent written with the{" "}
          <a href={A2A_SDK_URL} className={A}>
            official A2A Python SDK
          </a>{" "}
          ({v("a2a_sdk.version", "raw")}) is driven, in process, by the
          engine&apos;s own A2A client through {v("a2a_sdk.scenarios", "int")}{" "}
          sessions; the engine&apos;s agent must send the same{" "}
          {v("a2a_sdk.messages", "int")} messages once IDs and timestamps are
          normalised.
        </p>

        <h2>What is real and what is illustrative</h2>
        <ul>
          <li>
            Real: every message&apos;s content and size (equal to the SDK&apos;s
            for the recorded sessions), the HTTP header bytes for the header set
            shown, and the token counts (Qwen2.5&apos;s tokenizer).
          </li>
          <li>
            Illustrative: transport latencies and rates, server work times, and
            the user&apos;s and model&apos;s answer times; the scripted answers
            themselves; the resuming server of chapter 4 (resumption was
            optional). Engine-only behaviour (pagination, cancellation, list
            changes) follows the specification and is marked in the chapters.
          </li>
          <li>
            Illustrative too: the A2A agents&apos; scripted replies and times,
            the gateway&apos;s four servers, and every host, token, handle and
            &quot;secret&quot; in the OAuth and attack walk-throughs (invented,
            under <code>example.com</code>).
          </li>
        </ul>

        <h2>How it is checked</h2>
        <ul>
          <li>
            Engine: Python tests, the live SDK recording, and exact TS parity on
            every session and frame (in Agent_Loop_Sim&apos;s CI).
          </li>
          <li>
            Site: the vendored files&apos; hashes; every chapter&apos;s sessions
            and frames against the Python reference (unit tests); key
            frames&apos; captions on the page (end-to-end); every number in the
            prose is computed by the engine at build time; every code block is
            cut from the vendored engine, and every JSON message shown is one
            the engine sends.
          </li>
          <li>
            Every animation plays, pauses, steps, scrubs and resets from the
            keyboard, with no console errors, in light and dark mode at 1,280
            and 390 px wide; nothing plays by itself with reduced motion; axe
            finds no accessibility violations; Lighthouse scores at least 0.9.
          </li>
        </ul>

        <h2>Go deeper</h2>
        <p>
          The slides behind the chapters: the{" "}
          <a href={MCP_HUB} className={A}>
            MCP
          </a>{" "}
          series,{" "}
          <a href={OAUTH_FOR_MCP} className={A}>
            OAuth for MCP
          </a>{" "}
          and the{" "}
          <a href={AGENTS_HUB} className={A}>
            Agents
          </a>{" "}
          hub. Source and issues:{" "}
          <a href={GITHUB_URL} className={A}>
            GitHub
          </a>
          .
        </p>
      </div>
    </main>
  );
}
