/** The pages and animations every e2e spec walks. */
export const PAGES = [
  "/",
  "/learn",
  "/conformance",
  "/about",
  "/learn/01-why-a-protocol",
  "/learn/02-json-rpc-and-the-life-cycle",
  "/learn/03-tools-resources-and-prompts",
  "/learn/04-transports",
  "/learn/05-sampling-and-elicitation",
] as const;

export const ANIMATIONS = [
  ["/learn/01-why-a-protocol", "integration-widget"],
  ["/learn/01-why-a-protocol", "journey-widget"],
  ["/learn/02-json-rpc-and-the-life-cycle", "sequence-lifecycle"],
  ["/learn/03-tools-resources-and-prompts", "three-ways-widget"],
  ["/learn/04-transports", "transport-widget"],
  ["/learn/04-transports", "drop-widget"],
  ["/learn/05-sampling-and-elicitation", "sequence-reverse"],
] as const;

/** The engine runs in a worker after the page loads: allow for a slow runner. */
export const ENGINE_TIMEOUT = 30_000;
