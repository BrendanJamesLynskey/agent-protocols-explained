import type { Route } from "next";
import Link from "next/link";

import { CheckedStrip, StartButton } from "@/components/ui/Landing";
import { EraBars } from "@/components/viz/EraBars";
import { formatValue, lookup } from "@/lib/proto/values";
import { SECTIONS } from "@/lib/mdx/sections";
import { ENGINE_URL, SDK_URL, SPEC_URL } from "@/lib/site";
import { ReadingOrder } from "@/components/ui/ReadingOrder";

const LINK =
  "focus-ring rounded underline decoration-accent/40 underline-offset-4 hover:decoration-accent";

/**
 * Landing page: what the site is, the picture behind every chapter (the same session in the
 * two protocol eras, to scale, computed by the engine at build time), and the ways in. Server
 * Component with no client JavaScript of its own.
 */
export default function HomePage(): JSX.Element {
  const v = (path: string, fmt: Parameters<typeof formatValue>[1]) =>
    formatValue(lookup(path), fmt);
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 sm:py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-accent dark:text-indigo-300">
        Agent Protocols Explained
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
        How agents talk to tools and to each other, message by message.
      </h1>
      <div className="mt-6 grid items-start gap-8 md:grid-cols-[1fr_minmax(0,24rem)]">
        <div>
          <p className="max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
            An interactive guide to MCP and A2A, animated by an engine that
            sends the same messages as the official SDKs.
          </p>
          <div className="mt-6">
            <StartButton href={`/learn/${SECTIONS[0]!.slug}` as Route} />
          </div>
        </div>
        <figure
          data-hero-figure
          className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <EraBars />
          <figcaption className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
            One short session (connect, then list and use a tool, a resource and
            a prompt) in each era, over Streamable HTTP, to scale: fewer
            messages without the handshake, but every request carries its own
            envelope.
          </figcaption>
        </figure>
      </div>
      <CheckedStrip href="/about#sdk">
        The engine sends the same {v("sdk.messages", "int")} messages as the
        official MCP Python SDK ({v("sdk.version", "raw")}) over{" "}
        {v("sdk.scenarios", "int")} recorded sessions, and the same{" "}
        {v("a2a_sdk.messages", "int")} as the official A2A SDK (
        {v("a2a_sdk.version", "raw")}), compared as JSON.
      </CheckedStrip>
      <section aria-labelledby="learn-heading" className="mt-12">
        <h2 id="learn-heading" className="text-xl font-semibold tracking-tight">
          What you&apos;ll learn
        </h2>
        <p className="mt-4 max-w-2xl text-neutral-600 dark:text-neutral-300">
          An agent reaches its tools through a protocol. The{" "}
          <strong>Model Context Protocol</strong> (MCP) is the common one: a
          host&apos;s MCP client sends JSON-RPC messages to an MCP server, over
          a pipe or over HTTP. Its current revision,{" "}
          <a href={SPEC_URL} className={LINK}>
            {v("spec.current", "raw")}
          </a>
          , dropped the handshake that every earlier revision began with: the
          same short session now takes {v("why.modern_tour.messages", "int")}{" "}
          messages instead of {v("why.legacy_tour.messages", "int")}.
        </p>
        <p className="mt-4 max-w-2xl text-neutral-600 dark:text-neutral-300">
          Each chapter is built around an animation of real protocol messages.
          They come from{" "}
          <a href={ENGINE_URL} className={LINK}>
            Agent_Loop_Sim
          </a>
          &apos;s protocol state machines, and in CI the{" "}
          <a href={SDK_URL} className={LINK}>
            official MCP Python SDK
          </a>{" "}
          ({v("sdk.version", "raw")}) plays the same {v("sdk.scenarios", "int")}{" "}
          sessions: the simulator must send the same messages (see{" "}
          <Link href="/conformance" className={LINK}>
            the recordings
          </Link>
          ). Agents talk to other agents too: chapter 8 follows a task between
          two agents over <strong>A2A</strong> 1.0, checked the same way against
          the official A2A SDK ({v("a2a_sdk.version", "raw")}). Then
          authorisation, gateways and the attacks on all of it. Nothing here
          calls a live model or opens a real connection.
        </p>
      </section>
      <ReadingOrder current="protocols" />
      <nav
        aria-label="Chapters"
        className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {SECTIONS.map((s, i) => (
          <Link
            key={s.slug}
            href={`/learn/${s.slug}`}
            className="focus-ring group rounded-lg border border-neutral-200 p-5 hover:border-accent dark:border-neutral-800 dark:hover:border-indigo-400"
          >
            <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
              {String(i + 1).padStart(2, "0")}
            </p>
            <h2 className="mt-1 font-semibold">{s.title}</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {s.summary}
            </p>
          </Link>
        ))}
      </nav>
      <p
        data-track-start
        className="mt-12 text-sm text-neutral-600 dark:text-neutral-400"
      >
        New to the Agents track?{" "}
        <a
          href="https://agent-harnesses-explained.vercel.app/agents"
          className="focus-ring rounded underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
        >
          Start here
        </a>
        : the six sites in reading order, what you need first, and a glossary of
        the terms they define.
      </p>
      <p className="mt-12 text-sm text-neutral-600 dark:text-neutral-400">
        Part of a family of sixteen companion sites in four tracks, all in the
        site menu above: Foundations (
        <a
          href="https://transformer-decoder-explained.vercel.app"
          className={LINK}
        >
          Decoder
        </a>
        ,{" "}
        <a
          href="https://transformer-training-explained.vercel.app"
          className={LINK}
        >
          Training
        </a>
        ), Hardware (
        <a href="https://gpu-kernels-explained.vercel.app" className={LINK}>
          Kernels
        </a>
        ,{" "}
        <a href="https://systolic-arrays-explained.vercel.app" className={LINK}>
          Systolic
        </a>
        ,{" "}
        <a href="https://ai-accelerators-explained.vercel.app" className={LINK}>
          Accelerators
        </a>
        ,{" "}
        <a href="https://ai-racks-explained.vercel.app" className={LINK}>
          Racks
        </a>
        ), Inference (
        <a href="https://llm-inference-explained.vercel.app" className={LINK}>
          Serving
        </a>
        ,{" "}
        <a
          href="https://llm-architectures-explained.vercel.app"
          className={LINK}
        >
          Architectures
        </a>
        ,{" "}
        <a href="https://numerics-explained.vercel.app" className={LINK}>
          Numerics
        </a>
        ,{" "}
        <a
          href="https://inference-tradeoffs-explained.vercel.app"
          className={LINK}
        >
          Trade-offs
        </a>
        ) and Agents (
        <a href="https://agent-harnesses-explained.vercel.app" className={LINK}>
          Harnesses
        </a>
        , <strong className="font-medium">Protocols</strong>,{" "}
        <a href="https://agent-context-explained.vercel.app" className={LINK}>
          Context
        </a>
        ,{" "}
        <a
          href="https://agent-orchestration-explained.vercel.app"
          className={LINK}
        >
          Orchestration
        </a>
        ,{" "}
        <a href="https://agent-evals-explained.vercel.app" className={LINK}>
          Evals
        </a>
        ,{" "}
        <a href="https://agent-security-explained.vercel.app" className={LINK}>
          Security
        </a>
        ). It is the second of the six agent sites. How this one was built, and
        how to check it:{" "}
        <Link href="/about" className={LINK}>
          about
        </Link>
        .
      </p>
    </main>
  );
}
