/**
 * The family's visual language (explained_sites_visual_standard.md §3): Okabe and Ito's
 * colour-blind-safe palette, the same in light and dark mode. On the Protocols site:
 *
 * - one colour per actor (model, host, MCP client, MCP server, user), used on every chapter;
 * - one colour per message kind (request, notification, result, error);
 * - "active" is a highlight, "done" is muted, and errors and drops use the warning hue plus a
 *   dash or hatch pattern, never colour alone.
 *
 * Okabe, M. and Ito, K. (2008), "Color Universal Design (CUD): how to make figures and
 * presentations that are friendly to colorblind people", https://jfly.uni-koeln.de/color/
 */

export const OKABE_ITO = {
  black: "#000000",
  orange: "#E69F00",
  sky: "#56B4E9",
  green: "#009E73",
  yellow: "#F0E442",
  blue: "#0072B2",
  vermillion: "#D55E00",
  purple: "#CC79A7",
} as const;

/** One colour per actor in a protocol exchange, the same on every chapter. */
export const ACTOR_COLOUR: Record<string, string> = {
  model: OKABE_ITO.orange,
  host: OKABE_ITO.sky,
  client: OKABE_ITO.blue,
  server: OKABE_ITO.green,
  user: OKABE_ITO.purple,
  browser: OKABE_ITO.purple,
  as: OKABE_ITO.yellow,
  mcp: OKABE_ITO.green,
  network: OKABE_ITO.vermillion,
};

export const ACTOR_NAME: Record<string, string> = {
  model: "Model",
  host: "Host",
  client: "MCP client",
  server: "MCP server",
  user: "User",
  network: "Network",
};

/** Message kinds: requests solid, notifications dashed, errors in the warning hue (and a cross). */
export const MESSAGE_COLOUR: Record<string, string> = {
  request: OKABE_ITO.blue,
  notification: OKABE_ITO.sky,
  result: OKABE_ITO.green,
  error: OKABE_ITO.vermillion,
  malformed: OKABE_ITO.vermillion,
  gate: OKABE_ITO.purple,
};

/** Bytes: the JSON-RPC payload and the transport's framing around it. */
export const BYTES_COLOUR = {
  payload: OKABE_ITO.blue,
  framing: OKABE_ITO.orange,
} as const;

export const STATE_COLOUR = {
  active: OKABE_ITO.blue,
  stalled: OKABE_ITO.vermillion,
  ok: OKABE_ITO.green,
} as const;

/** Muted ("done", "idle") greys: Tailwind neutral-400 and neutral-600. */
export const MUTED = { light: "#a3a3a3", dark: "#525252" } as const;
