import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./typography.css";
import { Header } from "./components/header";
import { ThemeProvider } from "./components/theme-provider";
import { PreferencesProvider } from "./components/preferences-provider";

const prePaintScript = `try {
var ua = navigator.userAgentData;
var uaStr = (navigator.userAgent || "") + " " + (navigator.platform || "");
if ((ua && ua.platform === "macOS") || /Mac|iPhone|iPad|iPod/i.test(uaStr)) document.documentElement.dataset.os = "mac";
var view = new URLSearchParams(window.location.search).get("view");
var raw = localStorage.getItem("userPrefsV2");
var rules = "";
var esc = function(s){return s.replace(/[\\\\"]/g, "\\\\$&");};
if (raw) {
  var prefs = JSON.parse(raw);
  var entries = Object.entries(prefs.eventPrefs || {});
  var hidden = entries.filter(function(kv){return kv[1] && kv[1].hidden;}).map(function(kv){return kv[0];});
  hidden.forEach(function(k){rules += '[data-event-key="' + esc(k) + '"]{display:none}';});
  if (view === "starred") {
    var starred = entries.filter(function(kv){return kv[1] && kv[1].favorite;}).map(function(kv){return kv[0];});
    if (starred.length === 0) {
      rules += '[data-event-key]{display:none}[data-group-keys]{display:none}';
    } else {
      var sel = starred.map(function(k){return '[data-event-key="' + esc(k) + '"]';}).join(',');
      rules += '[data-event-key]:not(' + sel + '){display:none}';
      rules += '[data-group-keys]:not(:has(' + sel + ')){display:none}';
    }
  }
} else if (view === "starred") {
  rules += '[data-event-key]{display:none}[data-group-keys]{display:none}';
}
if (rules) {
  var style = document.createElement("style");
  style.id = "pl-prepaint-visibility";
  style.textContent = rules;
  document.head.appendChild(style);
}
} catch (e) {}`;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
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
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: pre-hydration script reads localStorage prefs and emits CSS so hidden/starred events match the user's saved state before React boots
          dangerouslySetInnerHTML={{ __html: prePaintScript }}
        />
      </head>
      <body>
        <ThemeProvider>
          <PreferencesProvider>
            <Header />
            <main>{children}</main>
          </PreferencesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
