import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./typography.css";
import { ThemeProvider } from "next-themes";
import { Header } from "./components/header";

export const metadata: Metadata = {
  title: "PL Conferences",
  description: "Conferences and workshops in programming languages",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <head />
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <main className="flex flex-col items-center w-full">
              <Header />
              <div className="mt-24 w-full md:w-[768px]">{children}</div>
            </main>
          </ThemeProvider>
        </body>
      </html>
    </>
  );
}
