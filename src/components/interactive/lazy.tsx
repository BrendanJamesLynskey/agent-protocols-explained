"use client";

/**
 * Code-split client widgets: each loads its own chunk after the page shell, so pages stay
 * light (the pattern of the companion sites' lazy.tsx). Each widget takes its equation as
 * server-rendered children.
 */
import dynamic from "next/dynamic";

function Placeholder({ what }: { what: string }): JSX.Element {
  return (
    <p
      data-pending-widget
      className="my-8 min-h-96 text-sm text-neutral-600 dark:text-neutral-400"
    >
      Loading the {what}…
    </p>
  );
}

const loading = (what: string) =>
  function Loading(): JSX.Element {
    return <Placeholder what={what} />;
  };

export const IntegrationWidget = dynamic(() => import("./IntegrationWidget"), {
  ssr: false,
  loading: loading("animation"),
});
export const JourneyWidget = dynamic(() => import("./JourneyWidget"), {
  ssr: false,
  loading: loading("animation"),
});
export const SequenceWidget = dynamic(() => import("./SequenceWidget"), {
  ssr: false,
  loading: loading("animation"),
});
export const ThreeWaysWidget = dynamic(() => import("./ThreeWaysWidget"), {
  ssr: false,
  loading: loading("animation"),
});
export const TransportWidget = dynamic(() => import("./TransportWidget"), {
  ssr: false,
  loading: loading("animation"),
});
export const DropWidget = dynamic(() => import("./DropWidget"), {
  ssr: false,
  loading: loading("animation"),
});
export const FlowWidget = dynamic(() => import("./FlowWidget"), {
  ssr: false,
  loading: loading("animation"),
});
export const GatewayWidget = dynamic(() => import("./GatewayWidget"), {
  ssr: false,
  loading: loading("animation"),
});
export const A2AWidget = dynamic(() => import("./A2AWidget"), {
  ssr: false,
  loading: loading("animation"),
});
