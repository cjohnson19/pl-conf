import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "./typography.css";
import { Header } from "./components/header";
import { ThemeProvider } from "./components/theme-provider";
import { PreferencesProvider } from "./components/preferences-provider";

// Run before React hydrates so the cmd/ctrl indicator and any other
// platform-conditional CSS keys off `[data-os="mac"]` from the first paint.
const osDetectScript = `try {
var ua = navigator.userAgentData;
var uaStr = (navigator.userAgent || "") + " " + (navigator.platform || "");
if ((ua && ua.platform === "macOS") || /Mac|iPhone|iPad|iPod/i.test(uaStr)) document.documentElement.dataset.os = "mac";
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
      <body>
        <Script
          id="os-detect"
          strategy="beforeInteractive"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: pre-hydration platform detection so CSS can pick the right cmd/ctrl glyph on the first paint
          dangerouslySetInnerHTML={{ __html: osDetectScript }}
        />
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
