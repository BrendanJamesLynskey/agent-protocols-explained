/**
 * Runs the engine off the main thread: answers { id, chapter } with everything that chapter
 * animates. The tokenizer (151k merges) is fetched and built only for a chapter that counts
 * tokens, and only once.
 */
import {
  MERGES_URL,
  needsTokenizer,
  runChapter,
  Tokenizer,
  type Chapter,
} from "./index";

let tok: Promise<Tokenizer> | null = null;

type Req = { id: number; chapter: Chapter };

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<Req>) => void) | null;
  postMessage: (m: unknown) => void;
};

ctx.onmessage = async (e) => {
  const { id, chapter } = e.data;
  try {
    let t: Tokenizer | null = null;
    if (needsTokenizer(chapter)) {
      tok ??= fetch(MERGES_URL)
        .then((r) => {
          if (!r.ok) throw new Error(`tokenizer: HTTP ${r.status}`);
          return r.text();
        })
        .then((x) => new Tokenizer(x));
      t = await tok;
    }
    ctx.postMessage({ id, data: runChapter(chapter, t) });
  } catch (err) {
    ctx.postMessage({
      id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
