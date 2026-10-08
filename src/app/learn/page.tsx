/**
 * /learn — index of chapters.
 *
 * Server Component, statically rendered. Same layout as the companion
 * sites' /learn (transformer-explainer's, minus the per-user progress
 * badges: this site has no accounts).
 */
import Link from "next/link";

import { SECTIONS } from "@/lib/mdx/sections";
import { MCP_HUB, OAUTH_FOR_MCP } from "@/lib/site";

export const metadata = {
  title: "Learn",
  description:
    "Chapters on how agents talk to tools over MCP, each built around an animation of real protocol messages from state machines checked against the official SDK.",
};

export default function LearnIndex(): JSX.Element {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-accent dark:text-indigo-300">
        /learn
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        How agents talk to tools
      </h1>
      <p className="mt-4 text-neutral-600 dark:text-neutral-300">
        One chapter per mechanism, each opening with an animation. Every message
        is sent by the Agent_Loop_Sim engine&apos;s protocol state machines,
        whose sessions equal the official MCP SDK&apos;s, message for message.
        Toggle layers (Concept / Maths / Code) inside any chapter to choose how
        deep to go. For the slides behind each chapter, see the{" "}
        <a
          href={MCP_HUB}
          className="focus-ring rounded text-accent underline underline-offset-2 dark:text-indigo-300"
        >
          MCP
        </a>{" "}
        series and{" "}
        <a
          href={OAUTH_FOR_MCP}
          className="focus-ring rounded text-accent underline underline-offset-2 dark:text-indigo-300"
        >
          OAuth for MCP
        </a>
        .
      </p>

      <ol className="mt-10 divide-y divide-neutral-200 dark:divide-neutral-800">
        {SECTIONS.map((s, i) => (
          <li key={s.slug} className="py-5">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Link
                href={`/learn/${s.slug}`}
                className="focus-ring rounded text-lg font-medium text-neutral-900 hover:text-accent dark:text-neutral-100"
              >
                {s.title}
              </Link>
            </div>
            <p className="mt-1 pl-9 text-sm text-neutral-600 dark:text-neutral-400">
              {s.summary}
            </p>
          </li>
        ))}
      </ol>
    </main>
  );
}
