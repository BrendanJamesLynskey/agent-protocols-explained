/**
 * Frame tests (visual standard §4). Everything a chapter animates is recomputed by the vendored
 * TS engine and must equal the Python reference's (tests/fixtures/site_fixtures.json, written by
 * scripts/make_fixtures.py from the reference at the vendored commit): every session's wire
 * messages, log, sequence-chart frames, negotiation and framing, and every chapter view. The
 * caption the page shows for a frame, built from the reference's frame, must equal the caption
 * built from the TS frame, on every frame.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CHAPTER_CONFIGS,
  proto,
  runChapter,
  type Chapter,
  type Obj,
} from "@/lib/engine";
import { nodeTokenizer } from "@/lib/engine/node";
import {
  a2aCaption,
  dropCaption,
  flowCaption,
  gatewayCaption,
  integrationCaption,
  journeyCaption,
  sequenceCaption,
  transportCaption,
} from "@/lib/proto/captions";

const fx = JSON.parse(
  readFileSync(join(__dirname, "../fixtures/site_fixtures.json"), "utf8"),
) as Obj;
const tok = nodeTokenizer();
const label = (s: Obj, i: number) =>
  (s.sequence as Obj[]).find((x) => !x.virtual && x.wire === i)?.label ?? "";

describe("fixtures", () => {
  it("cover every chapter", () => {
    expect(Object.keys(fx.chapters).sort()).toEqual(
      Object.keys(CHAPTER_CONFIGS).sort(),
    );
  });
});

for (const chapter of Object.keys(CHAPTER_CONFIGS) as Chapter[]) {
  describe(chapter, () => {
    const want = fx.chapters[chapter] as Obj;
    const got = runChapter(chapter, tok);

    for (const name of Object.keys(want.sessions)) {
      it(`${name}: the session equals the reference`, () => {
        expect(got.sessions[name]).toEqual(want.sessions[name]);
      });
      it(`${name}: captions from the reference's frames = from the port's`, () => {
        const a = want.sessions[name] as Obj;
        const b = got.sessions[name]!;
        expect((a.sequence as Obj[]).map(sequenceCaption)).toEqual(
          b.sequence.map(sequenceCaption),
        );
        for (const t of ["stdio", "http"] as const) {
          if (!a[t]) continue;
          const fa = a[t].frames as Obj[];
          const fb = (b[t] as Obj).frames as Obj[];
          expect(fa.map((f, i) => transportCaption(f, label(a, i)))).toEqual(
            fb.map((f, i) => transportCaption(f, label(b, i))),
          );
        }
      });
    }

    if (want.journeys)
      it("journeys and their captions", () => {
        expect(got.journeys).toEqual(want.journeys);
        for (const [k, steps] of Object.entries(
          want.journeys as Record<string, Obj[]>,
        ))
          expect(
            steps.map((s, i) => journeyCaption(s, i, steps.length)),
          ).toEqual(
            got.journeys![k]!.map((s, i) => journeyCaption(s, i, steps.length)),
          );
      });

    if (want.integration)
      it("integration frames and captions", () => {
        for (const f of want.integration as Obj[]) {
          const mine = proto.integrationFrames(f.n, f.m);
          expect(mine).toEqual(f);
          expect(
            (f.frames as Obj[]).map((x) => integrationCaption(x, f.n, f.m)),
          ).toEqual(
            (mine.frames as Obj[]).map((x) => integrationCaption(x, f.n, f.m)),
          );
        }
      });

    if (want.threeWays)
      it("three ways (Qwen2.5 tokens)", () => {
        expect(got.threeWays).toEqual(want.threeWays);
      });

    if (want.flows)
      it("every flow (OAuth variants, attacks), and its captions", () => {
        expect(got.flows).toEqual(want.flows);
        for (const [k, r] of Object.entries(want.flows as Record<string, Obj>))
          expect((r.frames as Obj[]).map(flowCaption)).toEqual(
            (got.flows![k]!.frames as Obj[]).map(flowCaption),
          );
      });

    if (want.gateways)
      it("the gateway under every policy (Qwen2.5 tokens), and its captions", () => {
        expect(got.gateways).toEqual(want.gateways);
        for (const [k, g] of Object.entries(
          want.gateways as Record<string, Obj>,
        ))
          expect((g.frames as Obj[]).map(gatewayCaption)).toEqual(
            (got.gateways![k]!.frames as Obj[]).map(gatewayCaption),
          );
      });

    if (want.a2a)
      it("every A2A session, the task states, and the captions", () => {
        expect(got.a2a).toEqual(want.a2a);
        expect(got.taskStates).toEqual(want.taskStates);
        for (const [k, a] of Object.entries(want.a2a as Record<string, Obj>))
          expect((a.frames as Obj[]).map(a2aCaption)).toEqual(
            got.a2a![k]!.frames.map(a2aCaption),
          );
      });

    if (want.drops)
      it("every broken stream, and its captions", () => {
        expect(got.drops).toEqual(want.drops);
        for (const [k, d] of Object.entries(want.drops as Record<string, Obj>))
          expect((d.steps as Obj[]).map(dropCaption)).toEqual(
            (got.drops![k]!.steps as Obj[]).map(dropCaption),
          );
      });
  });
}

describe("key frames say what the model says", () => {
  it("the handshake's third message is notifications/initialized", () => {
    const s = fx.chapters.lifecycle.sessions.legacy_tour as Obj;
    expect(sequenceCaption(s.sequence[2])).toBe(
      "MCP client → MCP server: notifications/initialized (notification, 54 bytes).",
    );
  });
  it("2026-07-28 elicitation: input_required, then the user, then a retry", () => {
    const seq = fx.chapters.reverse.sessions.modern_elicit_accept
      .sequence as Obj[];
    expect(seq.map((f) => f.label).slice(0, 5)).toEqual([
      'tools/call delete_file {"path":"build/"}',
      "input_required: elicitation/create",
      "show the form, wait for the user",
      "accept",
      'tools/call delete_file {"path":"build/"} + answers',
    ]);
  });
  it("OAuth: a token for another server is refused by the audience check", () => {
    const f = fx.chapters.oauth.flows.wrong_audience.frames as Obj[];
    const fail = f.find((x) => x.kind === "fail")!;
    expect(flowCaption(fail)).toBe(
      "MCP server checks: token audience is this server. Fails: the flow stops here.",
    );
    expect(f[f.length - 1]!.label).toBe("401 invalid_token");
  });
  it("gateway: flat names send search to the files server; prefixed names to web", () => {
    const g = fx.chapters.gateway.gateways as Obj;
    expect(g.flat.routed_to).toBe("files");
    expect(g.prefix.routed_to).toBe("web");
    expect(g.filtered.merged_tools).toBe(3);
  });
  it("A2A: streaming shows submitted, working, completed; the first chunk comes earlier", () => {
    const a = fx.chapters.a2a.a2a as Obj;
    expect(a.a2a_stream.summary.states).toEqual([
      "TASK_STATE_SUBMITTED",
      "TASK_STATE_WORKING",
      "TASK_STATE_COMPLETED",
    ]);
    expect(a.a2a_stream.summary.first_result_ms).toBeLessThan(
      a.a2a_send.summary.first_result_ms,
    );
    expect(a2aCaption(a.a2a_stream.frames[5])).toBe(
      "1.95 s · Research agent → Orchestrator: artifactUpdate (first chunk) (SSE event, 294 bytes). Task: working.",
    );
  });
  it("security: every attack does harm undefended and none defended", () => {
    for (const [k, r] of Object.entries(
      fx.chapters.security.flows as Record<string, Obj>,
    ))
      expect(r.outcome.harm, k).toBe(k.endsWith("-open"));
  });
  it("a resumed stream replays what it missed; a re-sent one redoes the work", () => {
    const d = fx.chapters.transports.drops as Obj;
    expect(d["handshake-5-2"].totals.replayed_events).toBe(4);
    expect(d["modern-5-2"].totals.redone_steps).toBe(2);
  });
});
