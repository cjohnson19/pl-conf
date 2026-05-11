import Link from "next/link";
import { Github, Plus } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header
      className="sticky top-0 z-10 grid items-center gap-6 border-b border-rule px-5 py-3.5 backdrop-blur-md md:px-8"
      style={{
        gridTemplateColumns: "auto 1fr auto",
        background: "color-mix(in srgb, var(--paper) 88%, transparent)",
      }}
    >
      <Link
        href="/"
        className="flex items-baseline gap-1.5 text-ink no-underline"
      >
        <span className="font-display text-[22px] font-medium tracking-[-0.06em] text-[color:var(--accent)]">
          PL
        </span>
        <span className="font-display text-[22px] font-normal italic leading-none tracking-[-0.01em]">
          Conferences
        </span>
      </Link>

      <span aria-hidden />

      <nav className="flex items-center gap-1.5 justify-self-end sm:gap-2">
        <Link
          href="/about"
          className="hidden -my-3 px-2 py-3 text-[13px] text-ink-2 no-underline transition-colors hover:text-ink sm:inline"
        >
          About
        </Link>
        <a
          href="https://github.com/cjohnson19/pl-conf"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Source on GitHub"
          className="grid h-11 w-11 place-items-center rounded-pill border border-rule text-ink transition-colors hover:bg-paper-2 sm:h-[34px] sm:w-[34px]"
        >
          <Github size={15} strokeWidth={1.75} />
        </a>
        <ThemeToggle />
        <span
          className="mx-1 hidden h-[18px] w-px bg-rule sm:inline-block"
          aria-hidden
        />
        <Link
          href="/submit"
          aria-label="Submit event"
          className="inline-flex h-11 w-max shrink-0 items-center gap-2 rounded-pill bg-ink px-3 text-[13px] font-medium text-paper no-underline transition-colors hover:bg-[color:var(--accent)] sm:h-[34px] sm:px-4"
        >
          <Plus size={12} strokeWidth={2} className="shrink-0" />
          <span className="hidden whitespace-nowrap sm:inline">
            Submit event
          </span>
        </Link>
      </nav>
    </header>
  );
}
