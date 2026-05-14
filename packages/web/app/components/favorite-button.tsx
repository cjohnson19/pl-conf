"use client";

import clsx from "clsx";
import { Star } from "lucide-react";
import { useFavorite } from "../lib/use-favorite";

export function FavoriteButton({ prefKey }: { prefKey: string }) {
  const { on, toggle } = useFavorite(prefKey);

  return (
    <button
      type="button"
      aria-label={on ? `Unstar ${prefKey}` : `Star ${prefKey}`}
      aria-pressed={on}
      title={on ? "Starred" : "Star"}
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      className={clsx(
        "grid h-11 w-11 shrink-0 place-items-center border-0 bg-transparent transition-colors sm:h-8 sm:w-8",
        on
          ? "text-[color:var(--accent)] hover:text-[color:var(--accent)]"
          : "text-ink-3 hover:text-ink"
      )}
    >
      <Star size={18} strokeWidth={1.75} fill={on ? "currentColor" : "none"} />
    </button>
  );
}
