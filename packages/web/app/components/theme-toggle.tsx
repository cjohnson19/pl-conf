"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className="grid h-11 w-11 place-items-center rounded-pill text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink sm:h-[34px] sm:w-[34px]"
    >
      <Sun size={17} strokeWidth={1.75} className="hidden dark:block" />
      <Moon size={17} strokeWidth={1.75} className="block dark:hidden" />
    </button>
  );
}
