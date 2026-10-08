/**
 * The landing page's figure: the same short session in the two protocol eras, to scale:
 * messages, bytes of JSON, and bytes of HTTP framing. Computed by the engine at build time
 * (server component, no client JavaScript).
 */
import { lookup } from "@/lib/proto/values";
import { fmtInt } from "@/lib/format";
import { BYTES_COLOUR } from "@/lib/viz/palette";

type Row = {
  label: string;
  payload: number;
  framing: number;
  messages: number;
};

export function EraBars(): JSX.Element {
  const row = (label: string, key: string): Row => ({
    label,
    payload: lookup(`why.${key}.bytes`) as number,
    framing: lookup(`why.${key}.http.overhead`) as number,
    messages: lookup(`why.${key}.messages`) as number,
  });
  const rows = [
    row("2025-11-25", "legacy_tour"),
    row("2026-07-28", "modern_tour"),
  ];
  const max = Math.max(...rows.map((r) => r.payload + r.framing));
  return (
    <div className="space-y-3 text-xs" data-testid="era-bars">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex justify-between font-mono text-neutral-700 dark:text-neutral-300">
            <span>{r.label}</span>
            <span>
              {r.messages} messages · {fmtInt(r.payload + r.framing)} B
            </span>
          </div>
          <div className="flex h-4" aria-hidden="true">
            <span
              style={{
                width: `${(r.payload / max) * 100}%`,
                background: BYTES_COLOUR.payload,
              }}
            />
            <span
              style={{
                width: `${(r.framing / max) * 100}%`,
                background: `repeating-linear-gradient(45deg, ${BYTES_COLOUR.framing} 0 3px, transparent 3px 5px)`,
                outline: `1px solid ${BYTES_COLOUR.framing}`,
              }}
            />
          </div>
          <p className="sr-only">
            {r.label}: {fmtInt(r.payload)} bytes of JSON and {fmtInt(r.framing)}{" "}
            bytes of HTTP framing in {r.messages} messages.
          </p>
        </div>
      ))}
      <p className="flex flex-wrap gap-3 text-neutral-600 dark:text-neutral-400">
        <span className="flex items-center gap-1">
          <span
            className="inline-block size-3"
            style={{ background: BYTES_COLOUR.payload }}
          />{" "}
          JSON-RPC
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block size-3"
            style={{
              background: `repeating-linear-gradient(45deg, ${BYTES_COLOUR.framing} 0 3px, transparent 3px 5px)`,
              outline: `1px solid ${BYTES_COLOUR.framing}`,
            }}
          />{" "}
          HTTP framing
        </span>
      </p>
    </div>
  );
}
