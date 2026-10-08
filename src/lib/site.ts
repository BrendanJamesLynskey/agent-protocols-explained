/**
 * Site-wide constants: this site's URL, its companion sites, the engine, the owner's slide
 * series it links into, and its repository.
 */

/** This site (production). */
export const SITE_URL = "https://agent-protocols-explained.vercel.app";

/** The companion sites. */
export const DECODER_URL = "https://transformer-decoder-explained.vercel.app";
export const INFERENCE_URL = "https://llm-inference-explained.vercel.app";
export const ARCHITECTURES_URL =
  "https://llm-architectures-explained.vercel.app";
export const KERNELS_URL = "https://gpu-kernels-explained.vercel.app";
export const NUMERICS_URL = "https://numerics-explained.vercel.app";
export const SILICON_URL = "https://systolic-arrays-explained.vercel.app";
export const TRADEOFFS_URL = "https://inference-tradeoffs-explained.vercel.app";
export const HARNESSES_URL = "https://agent-harnesses-explained.vercel.app";

export const GITHUB_URL =
  "https://github.com/BrendanJamesLynskey/agent-protocols-explained";
export const ENGINE_URL =
  "https://github.com/BrendanJamesLynskey/Agent_Loop_Sim";
export const SDK_URL = "https://github.com/modelcontextprotocol/python-sdk";
export const SPEC_URL =
  "https://modelcontextprotocol.io/specification/2026-07-28";

/** The owner's slide series the chapters link into ("go deeper"). */
export const MCP_HUB = "https://brendanjameslynskey.github.io/LLM_Hub_MCP/";
export const AGENTS_HUB =
  "https://brendanjameslynskey.github.io/LLM_Hub_Agents/";
export const OAUTH_FOR_MCP =
  "https://brendanjameslynskey.github.io/OAuth_for_MCP/";

/** A file in this site's repository on GitHub. */
export function repoFile(path: string): string {
  return `${GITHUB_URL}/blob/main/${path}`;
}
