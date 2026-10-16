/**
 * This site's favicon glyph (src/app/icon.svg) and its card's graphic.
 * Glyph: the bubble of the Agents track, the letter P, #2563eb.
 */
import { lookup } from "@/lib/proto/values";
import { BYTES_COLOUR } from "@/lib/viz/palette";

export function Glyph({ size }: { size: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect x="0.5" y="1" width="31" height="24" rx="6" fill="#2563eb" />
      <path d="M6 23v8.5l8.5-8.5z" fill="#2563eb" />
      <path
        d="M15.64 6Q18.34 6 19.59 7.17Q20.83 8.33 20.83 10.37Q20.83 11.59 20.32 12.66Q19.81 13.73 18.63 14.37Q17.44 15.02 15.4 15.02H14.13V20H11.17V6ZM15.48 8.43H14.13V12.59H15.11Q16.36 12.59 17.1 12.09Q17.83 11.59 17.83 10.47Q17.83 8.43 15.48 8.43Z"
        fill="#fff"
      />
    </svg>
  );
}

/**
 * A sequence diagram of the landing hero's session in the 2026-07-28 era: one arrow per message
 * (requests right, in the payload colour; replies left, in the framing colour), as many as the
 * engine counts.
 */
export function Motif(): JSX.Element {
  const n = Math.min(lookup("why.modern_tour.messages") as number, 12);
  const top = 40;
  const step = 340 / n;
  return (
    <svg width="440" height="420" viewBox="0 0 440 420">
      {[80, 360].map((x) => (
        <g key={x}>
          <rect
            x={x - 46}
            y={4}
            width={92}
            height={26}
            rx={6}
            fill="#1e293b"
            stroke="#94a3b8"
            strokeWidth={2}
          />
          <line
            x1={x}
            y1={30}
            x2={x}
            y2={410}
            stroke="#94a3b8"
            strokeWidth={3}
            strokeDasharray="6 8"
          />
        </g>
      ))}
      {Array.from({ length: n }, (_, i) => {
        const y = top + 12 + i * step;
        const right = i % 2 === 0;
        const c = right ? BYTES_COLOUR.payload : BYTES_COLOUR.framing;
        const [x1, x2] = right ? [86, 346] : [354, 94];
        const head = right
          ? `${x2},${y} ${x2 - 16},${y - 9} ${x2 - 16},${y + 9}`
          : `${x2},${y} ${x2 + 16},${y - 9} ${x2 + 16},${y + 9}`;
        return (
          <g key={i}>
            <line
              x1={x1}
              y1={y}
              x2={right ? x2 - 12 : x2 + 12}
              y2={y}
              stroke={c}
              strokeWidth={6}
              strokeLinecap="round"
            />
            <polygon points={head} fill={c} />
          </g>
        );
      })}
    </svg>
  );
}
