/**
 * Captures the README screenshots. Manual run, output committed.
 *
 *   pnpm build && pnpm start   # in another shell
 *   pnpm screenshots           # headless Chromium writes docs/screenshots/*.png
 *
 * Light theme, fixed viewport, reduced motion (nothing plays by itself), and
 * each animation set to a chosen mid-animation frame by its scrub bar, so
 * the pictures are reproducible.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium } from "@playwright/test";

const OUT = path.join(process.cwd(), "docs", "screenshots");
const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";

type Shot = { name: string; path: string; widget?: string; step?: number };

const SHOTS: Shot[] = [
  { name: "01-landing", path: "/" },
  {
    name: "02-integration",
    path: "/learn/01-why-a-protocol",
    widget: "integration-widget",
    step: 6,
  },
  {
    name: "03-journey",
    path: "/learn/01-why-a-protocol",
    widget: "journey-widget",
    step: 2,
  },
  {
    name: "04-life-cycle",
    path: "/learn/02-json-rpc-and-the-life-cycle",
    widget: "sequence-lifecycle",
    step: 6,
  },
  {
    name: "05-three-ways",
    path: "/learn/03-tools-resources-and-prompts",
    widget: "three-ways-widget",
    step: 8,
  },
  {
    name: "06-transports",
    path: "/learn/04-transports",
    widget: "transport-widget",
    step: 6,
  },
  {
    name: "07-stream-drop",
    path: "/learn/04-transports",
    widget: "drop-widget",
    step: 9,
  },
  {
    name: "08-elicitation",
    path: "/learn/05-sampling-and-elicitation",
    widget: "sequence-reverse",
    step: 6,
  },
  { name: "09-conformance", path: "/conformance" },
];

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  for (const s of SHOTS) {
    await page.goto(BASE + s.path, { waitUntil: "networkidle" });
    const file = path.join(OUT, `${s.name}.png`);
    if (s.widget) {
      const fig = page.getByTestId(s.widget);
      await fig.waitFor({ timeout: 30_000 });
      if (s.step !== undefined)
        await fig.getByTestId("scrub").fill(String(s.step));
      await fig.screenshot({ path: file });
    } else {
      await page.screenshot({ path: file });
    }
    console.log(`wrote ${path.relative(process.cwd(), file)}`);
  }
  await browser.close();
}

void main();
