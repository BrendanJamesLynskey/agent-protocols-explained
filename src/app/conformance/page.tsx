/**
 * /conformance: the official MCP SDK's recorded exchanges the engine is checked against,
 * scenario by scenario, with the server's source and how the recordings were made. Server
 * Component, static.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import SDK from "@/data/sdk_exchanges.json";
import { proto, type Obj } from "@/lib/engine";
import VENDORED from "@/lib/engine/vendor/VENDORED.json";
import { ENGINE_URL, SDK_URL, repoFile } from "@/lib/site";

export const metadata = {
  title: "Conformance",
  description:
    "The official MCP Python SDK's client and server, recorded over stdio: every session the simulator must reproduce, message for message.",
};

const A =
  "focus-ring rounded text-accent underline underline-offset-2 dark:text-indigo-300";

function arrow(w: Obj): string {
  return w.dir === "c2s" ? "client → server" : "server → client";
}

export default function ConformancePage(): JSX.Element {
  const scenarios = SDK.scenarios as unknown as Record<string, Obj[]>;
  const server = readFileSync(
    join(process.cwd(), "src/data/sdk_server.py.txt"),
    "utf8",
  );
  const meta = new Map(proto.SCENARIOS.map((s) => [s.name as string, s]));
  const total = Object.values(scenarios).reduce((a, v) => a + v.length, 0);
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-accent dark:text-indigo-300">
        /conformance
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Checked against the official SDK
      </h1>
      <div className="mdx-content mt-6">
        <p>
          Every recorded session below was played by the{" "}
          <a href={SDK_URL} className={A}>
            official MCP Python SDK
          </a>{" "}
          (<code>{SDK.sdk}</code>): its <code>Client</code>, in the mode the
          session names (<code>legacy</code> for the handshake era,{" "}
          <code>2026-07-28</code>, or <code>auto</code>, which asks{" "}
          <code>server/discover</code> first), talking over stdio to the small
          server at the end of this page. A tee between them logged every line.
          Sessions marked <em>raw</em> are hand-written lines sent to the same
          server, to show its errors. That is {Object.keys(scenarios).length}{" "}
          sessions and {total} messages.
        </p>
        <p>
          The simulator (
          <a href={ENGINE_URL} className={A}>
            Agent_Loop_Sim
          </a>{" "}
          at <code>{VENDORED.commit.slice(0, 7)}</code>) must produce the same
          messages, compared as JSON with request IDs (and progress tokens)
          renumbered in order of appearance: <code>c1, c2…</code> for the
          client&apos;s requests, <code>s1…</code> for the server&apos;s. Its CI
          records the SDK again on every change and requires live recording =
          committed recording = engine; the TypeScript port this site runs is
          checked against the same recording. The recording script is{" "}
          <a
            href="https://github.com/BrendanJamesLynskey/Agent_Loop_Sim/blob/main/scripts/record_sdk.py"
            className={A}
          >
            scripts/record_sdk.py
          </a>
          ; the file here is{" "}
          <a href={repoFile("src/data/sdk_exchanges.json")} className={A}>
            sdk_exchanges.json
          </a>
          .
        </p>
        <h2>What the recordings showed</h2>
        <ul>
          <li>
            The SDK&apos;s stdio server sends nothing back for a line that is
            not JSON (JSON-RPC 2.0 would answer <code>-32700</code>).
          </li>
          <li>
            A connection is locked to the era of its first valid request: a
            2026-07-28 request on a handshake connection gets{" "}
            <code>-32600</code>.
          </li>
          <li>
            After a tool result with <code>structuredContent</code>, the client
            lists the tools (to validate the output against the tool&apos;s{" "}
            <code>outputSchema</code>) if it has not already.
          </li>
          <li>
            An unknown tool comes back as a result with{" "}
            <code>isError: true</code>, where the specification&apos;s example
            uses a <code>-32602</code> error.
          </li>
          <li>
            <code>server/discover</code> advertises{" "}
            <code>listChanged: true</code> while <code>initialize</code> reports
            the server&apos;s own <code>false</code>.
          </li>
        </ul>
        <h2>The sessions</h2>
      </div>
      <ol className="mt-4 space-y-2">
        {Object.entries(scenarios).map(([name, msgs]) => {
          const sc = meta.get(name);
          return (
            <li key={name} id={name}>
              <details className="rounded border border-neutral-200 p-2 dark:border-neutral-800">
                <summary className="focus-ring min-h-11 cursor-pointer py-2 text-sm">
                  <span className="font-mono">{name}</span>{" "}
                  <span className="text-neutral-600 dark:text-neutral-400">
                    ({sc?.mode as string}, {msgs.length} messages):{" "}
                    {sc?.title as string}
                  </span>
                </summary>
                <ol className="mt-2 space-y-1 text-xs">
                  {msgs.map((w, i) => (
                    <li key={i}>
                      <p className="font-mono text-neutral-600 dark:text-neutral-400">
                        {i + 1}. {arrow(w)}
                      </p>
                      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-neutral-50 p-2 font-mono text-[0.7rem] text-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
                        {"msg" in w ? JSON.stringify(w.msg) : String(w.raw)}
                      </pre>
                    </li>
                  ))}
                </ol>
              </details>
            </li>
          );
        })}
      </ol>
      <div className="mdx-content mt-8">
        <h2>The server</h2>
        <p>
          Written with the SDK&apos;s high-level <code>MCPServer</code>. Its
          tools cover a plain call, progress, elicitation, sampling and an
          error; in 2026-07-28 it returns <code>input_required</code> where the
          handshake era sends a request.
        </p>
      </div>
      <details className="mt-2 rounded border border-neutral-200 p-2 dark:border-neutral-800">
        <summary className="focus-ring min-h-11 cursor-pointer py-2 text-sm">
          conformance/sdk_server.py
        </summary>
        <pre
          tabIndex={0}
          className="focus-ring overflow-x-auto whitespace-pre font-mono text-[0.7rem]"
        >
          {server}
        </pre>
      </details>
    </main>
  );
}
