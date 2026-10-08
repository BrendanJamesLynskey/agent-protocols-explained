/**
 * Chapter catalogue + filesystem loader for /learn content.
 *
 * MDX sources live under `/content/chapters/`, one per mechanism, each built
 * around an animation. Their slugs and order are defined here (single source
 * of truth); the `[slug]` route validates incoming params against this list
 * before reading from disk. Same shape as the companion sites'
 * `src/lib/mdx/sections.ts`.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const SECTIONS = [
  {
    slug: "01-why-a-protocol",
    title: "Why a protocol",
    summary:
      "N agents and M tools need N·M adapters point to point, or N+M implementations of one protocol; then one tool call followed from the model to the server and back.",
  },
  {
    slug: "02-json-rpc-and-the-life-cycle",
    title: "JSON-RPC and the life cycle",
    summary:
      "Every message of a session, both protocol eras: the handshake and its version negotiation, the stateless 2026-07-28 revision, progress, errors, pagination and cancellation.",
  },
  {
    slug: "03-tools-resources-and-prompts",
    title: "Tools, resources and prompts",
    summary:
      "The three things a server offers, told apart by who decides to use them: the model, the application or the user. The same document reaches the model all three ways.",
  },
  {
    slug: "04-transports",
    title: "Transports",
    summary:
      "stdio pipes against Streamable HTTP: bytes of framing and time per message, and an SSE stream that breaks mid-call, resumed in one revision and sent again in the next.",
  },
  {
    slug: "05-sampling-and-elicitation",
    title: "Server to client: sampling and elicitation",
    summary:
      "When a server needs the user or a model, the direction reverses: a request from the server (2025-11-25) or an input_required result and a retry (2026-07-28), with the human gates in the host.",
  },
  {
    slug: "06-authorisation",
    title: "Authorisation",
    summary:
      "The OAuth 2.1 flow an HTTP MCP server requires, step by step: discovery, registration, PKCE as SHA-256, the token's audience; and nine ways to break it, each failing at its own check.",
  },
  {
    slug: "07-gateways-and-composition",
    title: "Gateways and composition",
    summary:
      "One gateway in front of many servers: tool names that collide, a prefix that keeps them apart, an allow-list that cuts the tool list's token cost, and a call routed to the right server or the wrong one.",
  },
  {
    slug: "08-agent-to-agent",
    title: "Agent to agent (A2A)",
    summary:
      "An agent delegating to another over A2A 1.0: the agent card, a task's life cycle across two agents, streaming, input and auth required, cancellation; and where A2A and MCP overlap and differ.",
  },
  {
    slug: "09-protocol-security",
    title: "Protocol security, in brief",
    summary:
      "Three attacks at the protocol level, tool poisoning, a confused deputy and a hijacked state handle, each shown at the step where it happens, then again with the defence that stops it.",
  },
] as const;

export type SectionSlug = (typeof SECTIONS)[number]["slug"];

const SLUG_SET = new Set<string>(SECTIONS.map((s) => s.slug));

export function isValidSlug(slug: string): slug is SectionSlug {
  return SLUG_SET.has(slug);
}

export function getSectionMeta(slug: SectionSlug): (typeof SECTIONS)[number] {
  return SECTIONS.find((s) => s.slug === slug) ?? SECTIONS[0];
}

/** Read the raw MDX source for a chapter, or `null` if it doesn't exist. */
export async function readSectionMdx(
  slug: SectionSlug,
): Promise<string | null> {
  const path = join(process.cwd(), "content", "chapters", `${slug}.mdx`);
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}
