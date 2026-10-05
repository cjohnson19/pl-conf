import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./typography.css";
import { events } from "@pl-conf/data";
import { isActiveAt } from "@pl-conf/core";
import { Header } from "./components/header";
import { IconSprite } from "./components/icons";
import { ThemeProvider } from "./components/theme-provider";
import { PreferencesProvider } from "./components/preferences-provider";
import { deferredChunksLoaderScript } from "./lib/deferred-chunks";
import { serverNow } from "./lib/server-now";

const prePaintScript = `try {
var ua = navigator.userAgentData;
var uaStr = (navigator.userAgent || "") + " " + (navigator.platform || "");
if ((ua && ua.platform === "macOS") || /Mac|iPhone|iPad|iPod/i.test(uaStr)) document.documentElement.dataset.os = "mac";
var view = new URLSearchParams(window.location.search).get("view");
var raw = localStorage.getItem("userPrefsV2");
var rules = "";
var esc = function(s){return s.replace(/[\\\\"]/g, "\\\\$&");};
// Inner try isolates JSON.parse so corrupt prefs don't skip the view=submissions
// block below — otherwise a single broken localStorage entry leaves both filters
// disabled and the user sees every row flash before VisibilityStyle hydrates.
var prefs = null;
try { if (raw) prefs = JSON.parse(raw); } catch (e) {}
var starred = [];
if (prefs) {
  // The collapse hint is server-rendered so first paint reserves its space;
  // dismissed visitors must never see it, so hide it before paint.
  if (prefs.display && prefs.display.collapseHintDismissed) rules += '[data-collapse-hint]{display:none}';
  starred = Object.entries(prefs.eventPrefs || {}).filter(function(kv){return kv[1] && kv[1].favorite;}).map(function(kv){return kv[0];});
}
if (view === "starred") {
  if (starred.length === 0) {
    rules += '[data-event-key]{display:none}[data-group-keys]{display:none}';
  } else {
    var sel = starred.map(function(k){return '[data-event-key="' + esc(k) + '"]';}).join(',');
    rules += '[data-event-key]:not(' + sel + '){display:none}';
    rules += '[data-group-keys]:not(:has(' + sel + ')){display:none}';
  }
}
if (view === "submissions") {
  rules += '[data-event-key]:not([data-has-open-submission]){display:none}';
  rules += '[data-group-keys]:not(:has([data-has-open-submission])){display:none}';
}
if (rules) {
  var style = document.createElement("style");
  style.id = "pl-prepaint-visibility";
  style.textContent = rules;
  document.head.appendChild(style);
}
if (starred.length > 0) {
  var starSel = starred.map(function(k){return '[data-pl-star][data-pref-key="' + esc(k) + '"]';}).join(',');
  var starStyle = document.createElement("style");
  starStyle.id = "pl-prepaint-stars";
  starStyle.textContent = starSel + '{color:var(--accent)}' + starSel + ' svg{fill:currentColor}';
  document.head.appendChild(starStyle);
  document.addEventListener("DOMContentLoaded", function(){
    document.querySelectorAll(starSel).forEach(function(b){
      var k = b.getAttribute("data-pref-key") || "";
      b.setAttribute("aria-pressed", "true");
      b.setAttribute("aria-label", "Unstar " + k);
      b.setAttribute("title", "Starred");
    });
  });
}
} catch (e) {}`;

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
          // biome-ignore lint/security/noDangerouslySetInnerHtml: pre-hydration script reads localStorage prefs and emits CSS so starred events match the user's saved state before React boots
          dangerouslySetInnerHTML={{ __html: prePaintScript }}
        />
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: re-activates the hydration chunks nginx marks inert (see lib/deferred-chunks.ts)
          dangerouslySetInnerHTML={{ __html: deferredChunksLoaderScript }}
        />
      </head>
      <body>
        <IconSprite />
        <ThemeProvider>
          <PreferencesProvider>
            <Header totalActive={totalActive} />
            <main>{children}</main>
          </PreferencesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
