import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./typography.css";
import { events } from "@pl-conf/data";
import { isActiveAt } from "@pl-conf/core";
import { Header } from "./components/header";
import { IconSprite } from "./components/icons";
import { ThemeProvider } from "./components/theme-provider";
import { deferredChunksLoaderScript } from "./lib/deferred-chunks";
import { prePaint } from "./lib/pre-paint";
import { serverNow } from "./lib/server-now";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  // "optional": if Inter isn't ready within the brief block period, the page
  // keeps the metrics-adjusted fallback for that view instead of swapping
  // later. A late swap repaints the largest text block, which re-registers
  // LCP at font-arrival time (~1s late under mobile throttling).
  display: "optional",
});

export const metadata: Metadata = {
  title: "PL Conferences",
  description: "Conferences and workshops in programming languages",
  referrer: "no-referrer",
  authors: [
    {
      url: "https://chasej.dev",
      name: "Chase Johnson",
    },
  ],
  keywords: [
    "programming languages",
    "conferences",
    "workshops",
    "PL",
    "events",
    "calendar",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Counted per render, not once at module scope: the container is long-lived,
  // so a module-scope count would freeze at process start and drift out of
  // agreement with the per-request list as events end.
  const totalActive = Object.values(events).filter(
    isActiveAt(serverNow())
  ).length;
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: pre-hydration script reads localStorage prefs and emits CSS so starred events match the user's saved state before React boots (lib/pre-paint.ts)
          dangerouslySetInnerHTML={{ __html: `(${prePaint.toString()})();` }}
        />
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: re-activates the hydration chunks nginx marks inert (see lib/deferred-chunks.ts)
          dangerouslySetInnerHTML={{ __html: deferredChunksLoaderScript }}
        />
      </head>
      <body>
        <IconSprite />
        <ThemeProvider>
          <Header totalActive={totalActive} />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
