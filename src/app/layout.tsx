/**
 * Root layout for the App Router.
 *
 * Server Component, copied from transformer-explainer's layout (via the companion sites): HTML
 * scaffold, the global stylesheet and the site header. Dark mode follows
 * the system setting (`darkMode: "media"` in tailwind.config.ts).
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/ui/SiteHeader";
import { SITE_URL } from "@/lib/site";
import { withShare } from "@/lib/share";

import "./globals.css";

export const metadata: Metadata = withShare("/", {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Agent Protocols Explained",
    template: "%s · Agent Protocols Explained",
  },
  description:
    "How agents talk to tools and to each other, message by message: the Model Context Protocol in both its eras, JSON-RPC, tools, resources and prompts, transports, sampling and elicitation, authorisation, gateways, agent-to-agent (A2A) and protocol security, each animated by protocol state machines checked against the official MCP and A2A SDKs.",
});

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
