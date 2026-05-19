import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { SubmitEventPopover } from "./submit-event-popover";
import { SettingsPopover } from "./settings-popover";

export function Header() {
  return (
    <header
      className="grid items-center gap-3 border-b border-rule px-4 py-3.5 sm:gap-6 sm:px-5 md:px-8"
      style={{
        gridTemplateColumns: "auto 1fr auto",
      }}
    >
      <Link
        href="/"
        className="flex min-w-0 items-baseline gap-1.5 text-ink no-underline"
      >
        <span className="font-display text-[20px] font-medium tracking-[-0.06em] text-[color:var(--accent)] sm:text-[22px]">
          PL
        </span>
        <span className="font-display text-[20px] font-normal leading-none tracking-[-0.01em] sm:text-[22px]">
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
        <ThemeToggle />
        <SettingsPopover />
        <span
          className="mx-1 hidden h-[18px] w-px bg-rule sm:inline-block"
          aria-hidden
        />
        <SubmitEventPopover />
      </nav>
    </header>
  );
}
