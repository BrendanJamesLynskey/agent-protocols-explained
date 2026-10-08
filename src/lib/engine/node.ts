/**
 * The tokenizer for code that runs in Node (server rendering, tests, scripts): read from the
 * vendored merges file on disk. The browser fetches the same file (see useEngine).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Tokenizer } from "./vendor/index";

let tok: Tokenizer | null = null;

export function nodeTokenizer(): Tokenizer {
  if (!tok)
    tok = new Tokenizer(
      readFileSync(
        join(process.cwd(), "public/tokenizer/qwen2.5-merges.txt"),
        "utf8",
      ),
    );
  return tok;
}
