"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { headerIconButtonClass } from "./icon-button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className={headerIconButtonClass}
    >
      <Sun size={17} strokeWidth={1.75} className="hidden dark:block" />
      <Moon size={17} strokeWidth={1.75} className="block dark:hidden" />
    </button>
  );
}
