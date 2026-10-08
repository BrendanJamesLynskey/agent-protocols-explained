"use client";

/**
 * Everything a chapter animates, computed by the vendored engine in a Web Worker (one shared
 * worker). Falls back to the main thread if workers are unavailable. Results are cached per
 * chapter for the page's lifetime.
 */
import { useEffect, useState } from "react";

import type { Chapter, ChapterData } from "@/lib/engine";

export type EngineState =
  | { status: "loading" }
  | { status: "ready"; data: ChapterData }
  | { status: "error"; error: string };

let worker: Worker | null | undefined;
let nextId = 0;
const waiting = new Map<
  number,
  { resolve: (r: ChapterData) => void; reject: (e: Error) => void }
>();
const cache = new Map<Chapter, Promise<ChapterData>>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(
      new URL("../../lib/engine/engine.worker.ts", import.meta.url),
    );
    worker.onmessage = (
      e: MessageEvent<{ id: number; data?: ChapterData; error?: string }>,
    ) => {
      const w = waiting.get(e.data.id);
      if (!w) return;
      waiting.delete(e.data.id);
      if (e.data.data) w.resolve(e.data.data);
      else w.reject(new Error(e.data.error ?? "engine failed"));
    };
  } catch {
    worker = null;
  }
  return worker;
}

async function mainThread(chapter: Chapter): Promise<ChapterData> {
  const { MERGES_URL, Tokenizer, needsTokenizer, runChapter } =
    await import("@/lib/engine");
  let tok = null;
  if (needsTokenizer(chapter)) {
    const text = await fetch(MERGES_URL).then((r) => r.text());
    tok = new Tokenizer(text);
  }
  return runChapter(chapter, tok);
}

export function loadChapter(chapter: Chapter): Promise<ChapterData> {
  let p = cache.get(chapter);
  if (!p) {
    const w = getWorker();
    p = w
      ? new Promise<ChapterData>((resolve, reject) => {
          const id = nextId++;
          waiting.set(id, { resolve, reject });
          w.postMessage({ id, chapter });
        })
      : mainThread(chapter);
    cache.set(chapter, p);
  }
  return p;
}

export function useEngine(chapter: Chapter): EngineState {
  const [state, setState] = useState<EngineState>({ status: "loading" });
  useEffect(() => {
    let live = true;
    loadChapter(chapter).then(
      (data) => live && setState({ status: "ready", data }),
      (e: Error) => live && setState({ status: "error", error: e.message }),
    );
    return () => {
      live = false;
    };
  }, [chapter]);
  return state;
}
