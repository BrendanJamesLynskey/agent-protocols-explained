# Agent Protocols Explained

**Live:** https://agent-protocols-explained.vercel.app

How agents talk to tools and to each other, at the level of messages on the wire. The **Model Context Protocol** (MCP)
in both its eras: the handshake era (revisions 2024-11-05 to 2025-11-25) and the current revision,
**2026-07-28** ([specification](https://modelcontextprotocol.io/specification/2026-07-28), current on the
[versioning page](https://modelcontextprotocol.io/specification/versioning) when accessed on 2026-10-08),
which removed the handshake, sessions and stream resumption. Each chapter is built around an animation,
with the maths beside the picture. Every message is sent by the protocol state machines of
[Agent_Loop_Sim](https://github.com/BrendanJamesLynskey/Agent_Loop_Sim), and **checked against the official
MCP Python SDK**: in the engine's CI the SDK's own client and server play the same 18 sessions over stdio,
and the simulator must send the same messages, request IDs aside. Then **A2A** (agent to agent, version
**1.0**: [specification](https://a2a-protocol.org/latest/specification/), release
[v1.0.1](https://github.com/a2aproject/A2A/releases/tag/v1.0.1) of 2026-05-28, accessed 2026-10-08), checked
the same way against the **official A2A Python SDK**: an SDK agent driven by the engine's own client through
8 sessions; MCP's OAuth 2.1 authorisation; gateways; and the attacks on all of it. Nothing calls a live model
or opens a real connection.

![Chapter 8: a task between two agents over A2A, its state machine lighting up as each state arrives](docs/media/agent-to-agent.gif)

Part of a family of companion sites. Agents: [Agent Harnesses Explained](https://agent-harnesses-explained.vercel.app),
this one, then [Agent Context Explained](https://agent-context-explained.vercel.app). LLM systems: the [Transformer Decoder Explainer](https://transformer-decoder-explained.vercel.app),
[LLM Inference Explained](https://llm-inference-explained.vercel.app),
[LLM Architectures Explained](https://llm-architectures-explained.vercel.app),
[GPU Kernels Explained](https://gpu-kernels-explained.vercel.app),
[Numerics Explained](https://numerics-explained.vercel.app),
[Systolic Arrays Explained](https://systolic-arrays-explained.vercel.app) and
[Inference Trade-offs Explained](https://inference-tradeoffs-explained.vercel.app).

## Chapters

| #   | Chapter                                                                                                           | The animation                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | [Why a protocol](https://agent-protocols-explained.vercel.app/learn/01-why-a-protocol)                            | N agents × M tools: N·M adapters collapse to N+M; then one tool call from the model to the server and back          |
| 2   | [JSON-RPC and the life cycle](https://agent-protocols-explained.vercel.app/learn/02-json-rpc-and-the-life-cycle)  | A message sequence chart of real sessions, each message expandable; versions negotiated as two sets intersected     |
| 3   | [Tools, resources and prompts](https://agent-protocols-explained.vercel.app/learn/03-tools-resources-and-prompts) | The same README reaching the model three ways: chosen by the model, the application or the user                     |
| 4   | [Transports](https://agent-protocols-explained.vercel.app/learn/04-transports)                                    | Bytes and time per message on stdio and Streamable HTTP; an SSE stream breaking mid-call, resumed or re-sent        |
| 5   | [Sampling and elicitation](https://agent-protocols-explained.vercel.app/learn/05-sampling-and-elicitation)        | The server needing the user or a model: a request the other way (2025-11-25) or `input_required` and a retry        |
| 6   | [Authorisation](https://agent-protocols-explained.vercel.app/learn/06-authorisation)                              | The OAuth 2.1 dance step by step, PKCE computed with real SHA-256; nine ways to break it, each failing at its check |
| 7   | [Gateways and composition](https://agent-protocols-explained.vercel.app/learn/07-gateways-and-composition)        | One gateway, four servers: colliding tool names, prefixes, an allow-list, the tool list's tokens, routing           |
| 8   | [Agent to agent (A2A)](https://agent-protocols-explained.vercel.app/learn/08-agent-to-agent)                      | Two agents and one task: the agent card, the task's state machine, streaming, input and auth required; A2A vs MCP   |
| 9   | [Protocol security, in brief](https://agent-protocols-explained.vercel.app/learn/09-protocol-security)            | Tool poisoning, a confused deputy and a hijacked state handle, each with its defence off and on                     |

Each animation, recorded frame by frame from the engine's states (`pnpm animations`):

| Why a protocol                            | Life cycle                                   | A broken stream                            | Elicitation                                       |
| ----------------------------------------- | -------------------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| ![N×M to N+M](docs/media/integration.gif) | ![Sequence chart](docs/media/life-cycle.gif) | ![Stream drop](docs/media/stream-drop.gif) | ![Elicitation](docs/media/elicitation.gif)        |
| **Authorisation**                         | **Gateways**                                 | **Agent to agent**                         | **Tool poisoning, defended**                      |
| ![OAuth 2.1](docs/media/oauth.gif)        | ![Gateway](docs/media/gateway.gif)           | ![A2A](docs/media/agent-to-agent.gif)      | ![Attack](docs/media/tool-poisoning-defended.gif) |

## The engine

The site vendors Agent_Loop_Sim's TypeScript port at a pinned commit (`pnpm vendor:engine <sha>`;
`src/lib/engine/vendor/VENDORED.json` records the commit and each file's SHA-256) and runs it in a Web
Worker. Its `protocols` module (engine 1.3.0) has:

- MCP's **client and server as state machines** over JSON-RPC 2.0, in both eras: the handshake and
  capability negotiation, the stateless `_meta` envelope and `server/discover`, tools, resources and
  prompts, progress, errors, elicitation and sampling (server requests, or `input_required` and a retry),
  and, engine only, pagination, cancellation and list changes;
- **transports**: stdio and Streamable HTTP framing (a minimal header set, byte for byte), a latency model,
  and an SSE stream broken mid-call, resumed with `Last-Event-ID` or re-sent;
- **OAuth 2.1** as a state machine with mis-configured variants (chapter 6);
- **A2A 1.0** (since 1.3.0): an orchestrating agent and a remote research agent over the JSON-RPC binding
  with SSE: the agent card, the task life cycle, multi-turn input, in-task authorisation, cancellation, the
  error codes (chapter 8);
- an MCP **gateway** with three naming policies, and three **attacks** with and without their defences
  (chapters 7 and 9).

The Python reference and the TS port agree exactly; this site's CI installs the reference at the vendored
commit, regenerates `tests/fixtures/site_fixtures.json` and requires the port to reproduce it. The
recordings of the official SDKs (`src/data/sdk_exchanges.json`, `mcp` 2.3.0; `src/data/a2a_sdk_exchanges.json`,
`a2a-sdk` 1.2.2) are on the [conformance page](https://agent-protocols-explained.vercel.app/conformance).

## What is illustrative

Transport latencies and rates, server work times and the user's and model's answer times (all marked
in the chapters); the scripted answers; the resuming server of chapter 4 (2025-11-25 allowed resumption but
did not require it). Engine-only behaviour (pagination, cancellation, list changes) follows the specification
rather than an SDK recording. Message contents and sizes are real: for the recorded sessions they equal the
SDK's. A2A: the agents' replies and times are scripted. OAuth, gateway and attacks: every host, server, token,
handle and "secret" is an invented placeholder under `example.com`; the attacks are defensive walk-throughs,
not exploits.

## Checks

| Check                                                                                                                                                                                        | Where                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Python reference regenerates the site's fixtures; vendored hashes; the reference reproduces the SDK recordings                                                                               | CI "Model and fixtures" (`scripts/make_fixtures.py --check`, `tests/python`) |
| TS engine = Python reference on every session and frame; captions; chapters' code, quoted messages, equations, links and values                                                              | CI "Unit Tests" (`tests/unit`)                                               |
| Every page at 1,280 and 390 px, light and dark: no errors, no overflow; every animation plays, steps, scrubs, resets, keys; reduced motion; frame captions on the page; axe; the site switch | CI "E2E Tests" (`tests/e2e`)                                                 |
| Lighthouse ≥ 0.9 (performance, accessibility, best practices)                                                                                                                                | CI "Lighthouse"                                                              |

## Develop

```bash
pnpm install
pnpm dev                                    # http://localhost:3000
pnpm test && pnpm lint && pnpm typecheck
python3 -m venv .venv && .venv/bin/pip install -r reference/requirements.txt
.venv/bin/python scripts/make_fixtures.py --check
pnpm test:e2e                               # builds, then serves under --no-experimental-require-module
```

Deploying, smoke checks and updating the engine: [RUNBOOK.md](RUNBOOK.md).

## Origin

The structure, animation infrastructure (`useStepper`, `AnimationPanel`, the clock), MDX pipeline, CI,
checks and the two-group site switch are copied from
[agent-harnesses-explained](https://github.com/BrendanJamesLynskey/agent-harnesses-explained) (itself
from gpu-kernels-explained); the engine vendoring follows llm-inference-explained.

## Licence

MIT. Third-party files and their licences: [NOTICE](NOTICE).
