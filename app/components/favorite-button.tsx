"use client";

import clsx from "clsx";
import { useFavorite } from "../lib/use-favorite";

export function FavoriteButton({ prefKey }: { prefKey: string }) {
  const { on, toggle } = useFavorite(prefKey);

  return (
    <button
      type="button"
      aria-label={on ? `Stop watching ${prefKey}` : `Watch ${prefKey}`}
      aria-pressed={on}
      title={on ? "Watching" : "Watch"}
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
      <svg
        viewBox="0 0 24 24"
        width={18}
        height={18}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        {on ? (
          <circle cx={12} cy={12} r={3} fill="currentColor" stroke="none" />
        ) : (
          <circle cx={12} cy={12} r={3} />
        )}
      </svg>
    </button>
  );
}
