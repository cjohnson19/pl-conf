import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "./typography.css";
import { Header } from "./components/header";
import { ThemeProvider } from "./components/theme-provider";
import { PreferencesProvider } from "./components/preferences-provider";

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

const heroBootScript = `
(function(){try{
  var p=JSON.parse(localStorage.getItem('userPrefsV2')||'null');
  if(!p||!p.display)return;
  var d=p.display;
  var hasStarred=p.eventPrefs&&Object.keys(p.eventPrefs).some(function(k){var v=p.eventPrefs[k];return v&&v.favorite});
  var state;
  if(hasStarred){state=d.deadlineHeroDismissed?'hidden':'deadline';}
  else{state=d.introHeroDismissed?'hidden':'intro';}
  document.documentElement.setAttribute('data-hero',state);
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <Script
          id="hero-boot"
          strategy="beforeInteractive"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: hardcoded constant with no user input, runs before hydration to set data-hero on <html> from localStorage so returning users don't see a hero flash
          dangerouslySetInnerHTML={{ __html: heroBootScript }}
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
