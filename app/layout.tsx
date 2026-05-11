import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./typography.css";
import { Header } from "./components/header";
import { ThemeProvider } from "./components/theme-provider";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PL Conferences",
  description: "Conferences and workshops in programming languages",
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
    <html
      lang="en"
      className={`${GeistSans.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head />
      <body>
        <ThemeProvider>
          <Header />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
