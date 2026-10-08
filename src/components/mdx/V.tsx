/**
 * <V of="transports.legacy_tour.http.overhead" fmt="bytes" />: a number from the engine's runs,
 * formatted, in running prose. Server Component.
 */
import { formatValue, lookup, type Fmt } from "@/lib/proto/values";

export function V({ of, fmt = "num" }: { of: string; fmt?: Fmt }): JSX.Element {
  return <span data-v={of}>{formatValue(lookup(of), fmt)}</span>;
}
