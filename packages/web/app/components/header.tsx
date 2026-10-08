import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { HeaderActions } from "./header-actions";

export function Header({ totalActive }: { totalActive: number }) {
  return (
    <header
      className="grid items-center gap-3 border-b border-border px-4 py-3.5 sm:gap-6 sm:px-5 md:px-8"
      style={{
        gridTemplateColumns: "auto 1fr auto",
      }}
    >
      <Link
        href="/"
        prefetch={false}
        className="flex min-w-0 items-baseline gap-1.5 text-fg no-underline"
      >
        <span className="text-[20px] font-medium tracking-[-0.06em] text-accent sm:text-[22px]">
          PL
        </span>
        <span className="text-[20px] font-normal leading-none tracking-[-0.01em] sm:text-[22px]">
          Conferences
        </span>
      </Link>

      <span aria-hidden />

      <nav className="flex items-center justify-self-end gap-0 sm:gap-2">
        <Link
          href="/about"
          className="hidden -my-3 px-2 py-3 text-[13px] text-fg-2 no-underline transition-colors hover:text-fg sm:inline"
        >
          About
        </Link>
        <ThemeToggle />
        <HeaderActions totalActive={totalActive} />
      </nav>
    </header>
  );
}
