import Link from "next/link";

import { EraBars } from "@/components/viz/EraBars";
import { formatValue, lookup } from "@/lib/proto/values";
import { SECTIONS } from "@/lib/mdx/sections";
import {
  ARCHITECTURES_URL,
  DECODER_URL,
  ENGINE_URL,
  HARNESSES_URL,
  INFERENCE_URL,
  KERNELS_URL,
  NUMERICS_URL,
  SDK_URL,
  SILICON_URL,
  SPEC_URL,
  TRADEOFFS_URL,
} from "@/lib/site";

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
      <div className="mt-8 grid items-center gap-8 md:grid-cols-[1fr_minmax(0,24rem)]">
        <div>
          <p className="max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
            An agent reaches its tools through a protocol. The{" "}
            <strong>Model Context Protocol</strong> (MCP) is the common one: a
            host&apos;s MCP client sends JSON-RPC messages to an MCP server,
            over a pipe or over HTTP. Its current revision,{" "}
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
            ({v("sdk.version", "raw")}) plays the same{" "}
            {v("sdk.scenarios", "int")} sessions: the simulator must send the
            same messages (see{" "}
            <Link href="/conformance" className={LINK}>
              the recordings
            </Link>
            ). Agents talk to other agents too: chapter 8 follows a task between
            two agents over <strong>A2A</strong> 1.0, checked the same way
            against the official A2A SDK ({v("a2a_sdk.version", "raw")}). Then
            authorisation, gateways and the attacks on all of it. Nothing here
            calls a live model or opens a real connection.
          </p>
        </div>
        <figure className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <EraBars />
          <figcaption className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
            One short session (connect, then list and use a tool, a resource and
            a prompt) in each era, over Streamable HTTP, to scale: fewer
            messages without the handshake, but every request carries its own
            envelope.
          </figcaption>
        </figure>
      </div>
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
      <p className="mt-12 text-sm text-neutral-600 dark:text-neutral-400">
        The second of a family of agent sites, after{" "}
        <a href={HARNESSES_URL} className={LINK}>
          Agent Harnesses Explained
        </a>
        , alongside the LLM-systems sites: the{" "}
        <a href={DECODER_URL} className={LINK}>
          Transformer Decoder Explainer
        </a>
        ,{" "}
        <a href={INFERENCE_URL} className={LINK}>
          LLM Inference Explained
        </a>
        ,{" "}
        <a href={ARCHITECTURES_URL} className={LINK}>
          LLM Architectures Explained
        </a>
        ,{" "}
        <a href={KERNELS_URL} className={LINK}>
          GPU Kernels Explained
        </a>
        ,{" "}
        <a href={NUMERICS_URL} className={LINK}>
          Numerics Explained
        </a>
        ,{" "}
        <a href={SILICON_URL} className={LINK}>
          Systolic Arrays Explained
        </a>{" "}
        and{" "}
        <a href={TRADEOFFS_URL} className={LINK}>
          Inference Trade-offs Explained
        </a>
        . How this one was built, and how to check it:{" "}
        <Link href="/about" className={LINK}>
          about
        </Link>
        .
      </p>
    </main>
  );
}
