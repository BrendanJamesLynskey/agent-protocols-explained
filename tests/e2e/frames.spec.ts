/**
 * Frame tests on the page (visual standard §4): set key frames of every animation and require
 * the caption on screen to be the caption built from the Python reference's frame
 * (tests/fixtures/site_fixtures.json).
 */
import { expect, test, type Locator } from "@playwright/test";

import fx from "../fixtures/site_fixtures.json";

import {
  dropCaption,
  integrationCaption,
  journeyCaption,
  sequenceCaption,
  transportCaption,
} from "@/lib/proto/captions";
import type { Obj } from "@/lib/engine/vendor/index";

import { ENGINE_TIMEOUT } from "./pages";

// No autoplay (reduced motion): the test sets each frame itself.
test.use({ contextOptions: { reducedMotion: "reduce" } });

const CH = (fx as Obj).chapters as Obj;

async function change(fig: Locator, act: () => Promise<void>): Promise<void> {
  const before = (await fig.getAttribute("data-key")) ?? "";
  await act();
  await expect(fig).not.toHaveAttribute("data-key", before);
}

async function frame(fig: Locator, i: number, want: string): Promise<void> {
  await fig.getByTestId("scrub").fill(String(i));
  await expect(fig).toHaveAttribute("data-step", String(i));
  await expect(fig.getByTestId("caption")).toHaveText(want);
}

function keySteps(n: number): number[] {
  return [...new Set([0, 1, Math.floor(n / 2), n - 1])];
}

const label = (s: Obj, i: number) =>
  ((s.sequence as Obj[]).find((x) => !x.virtual && x.wire === i)
    ?.label as string) ?? "";

type Case = {
  path: string;
  id: string;
  name: string;
  captions: string[];
  choose?: (fig: Locator) => Promise<void>;
};

const seqCase = (
  path: string,
  id: string,
  chapter: string,
  name: string,
  choose?: Case["choose"],
): Case => ({
  path,
  id,
  name: `${chapter}/${name}`,
  captions: (CH[chapter].sessions[name].sequence as Obj[]).map(sequenceCaption),
  choose,
});

const select = (value: string) => async (fig: Locator) => {
  await change(fig, async () => {
    await fig.getByLabel("Session").selectOption(value);
  });
};
const radio = (name: string) => async (fig: Locator) => {
  await change(fig, () => fig.getByRole("radio", { name }).click());
};

const integ = (CH.why.integration as Obj[]).find(
  (f) => f.n === 5 && f.m === 6,
)!;
const threeRows = CH.primitives.threeWays.legacy_three_ways as Obj[];
const threeSeq = CH.primitives.sessions.legacy_three_ways.sequence as Obj[];
const httpTour = CH.transports.sessions.legacy_tour as Obj;

const CASES: Case[] = [
  {
    path: "/learn/01-why-a-protocol",
    id: "integration-widget",
    name: "integration 5×6",
    captions: (integ.frames as Obj[]).map((f) => integrationCaption(f, 5, 6)),
  },
  ...["legacy_tour", "modern_tour"].map((n, k) => ({
    path: "/learn/01-why-a-protocol",
    id: "journey-widget",
    name: `journey ${n}`,
    captions: (CH.why.journeys[n] as Obj[]).map((s, i, a) =>
      journeyCaption(s, i, a.length),
    ),
    choose: k === 0 ? undefined : radio("2026-07-28"),
  })),
  seqCase(
    "/learn/02-json-rpc-and-the-life-cycle",
    "sequence-lifecycle",
    "lifecycle",
    "legacy_tour",
  ),
  seqCase(
    "/learn/02-json-rpc-and-the-life-cycle",
    "sequence-lifecycle",
    "lifecycle",
    "raw_errors",
    select("raw_errors"),
  ),
  seqCase(
    "/learn/02-json-rpc-and-the-life-cycle",
    "sequence-lifecycle",
    "lifecycle",
    "legacy_cancel",
    select("legacy_cancel"),
  ),
  {
    path: "/learn/03-tools-resources-and-prompts",
    id: "three-ways-widget",
    name: "three ways (2025-11-25)",
    captions: threeSeq.map((f) => {
      const a = threeRows.find((r) =>
        (r.messages as number[]).includes(f.wire as number),
      );
      return `${a ? `[${a.primitive as string}] ` : ""}${sequenceCaption(f)}`;
    }),
  },
  {
    path: "/learn/04-transports",
    id: "transport-widget",
    name: "legacy_tour over HTTP",
    captions: (httpTour.http.frames as Obj[]).map((f, i) =>
      transportCaption(f, label(httpTour, i)),
    ),
  },
  {
    path: "/learn/04-transports",
    id: "transport-widget",
    name: "modern_elicit_accept over stdio",
    captions: (
      CH.transports.sessions.modern_elicit_accept.stdio.frames as Obj[]
    ).map((f, i) =>
      transportCaption(
        f,
        label(CH.transports.sessions.modern_elicit_accept, i),
      ),
    ),
    choose: async (fig) => {
      await select("modern_elicit_accept")(fig);
      await radio("stdio")(fig);
    },
  },
  {
    path: "/learn/04-transports",
    id: "drop-widget",
    name: "resume, n=5, k=2",
    captions: (CH.transports.drops["handshake-5-2"].steps as Obj[]).map(
      dropCaption,
    ),
  },
  {
    path: "/learn/04-transports",
    id: "drop-widget",
    name: "send again, n=5, k=2",
    captions: (CH.transports.drops["modern-5-2"].steps as Obj[]).map(
      dropCaption,
    ),
    choose: radio("2026-07-28: send again"),
  },
  seqCase(
    "/learn/05-sampling-and-elicitation",
    "sequence-reverse",
    "reverse",
    "legacy_elicit_accept",
  ),
  seqCase(
    "/learn/05-sampling-and-elicitation",
    "sequence-reverse",
    "reverse",
    "modern_elicit_accept",
    select("modern_elicit_accept"),
  ),
  seqCase(
    "/learn/05-sampling-and-elicitation",
    "sequence-reverse",
    "reverse",
    "legacy_sampling",
    select("legacy_sampling"),
  ),
];

for (const c of CASES) {
  test(`${c.id}: ${c.name} shows the reference's captions at key frames`, async ({
    page,
  }) => {
    await page.goto(c.path);
    const fig = page.getByTestId(c.id);
    await expect(fig).toBeVisible({ timeout: ENGINE_TIMEOUT });
    await fig.scrollIntoViewIfNeeded();
    if (c.choose) await c.choose(fig);
    await expect(fig.getByTestId("scrub")).toHaveAttribute(
      "max",
      String(c.captions.length - 1),
    );
    for (const i of keySteps(c.captions.length))
      await frame(fig, i, c.captions[i]!);
  });
}
