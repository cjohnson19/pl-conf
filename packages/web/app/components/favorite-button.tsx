"use client";

import clsx from "clsx";
import { useFavorite } from "../hooks/use-favorite";
import { Icon } from "./icons";
import { rowIconButtonClass } from "./icon-button";

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
        rowIconButtonClass,
        on ? "text-accent hover:text-accent" : "text-ink-3 hover:text-ink"
      )}
    >
      <Icon
        name="star"
        size={18}
        strokeWidth={1.75}
        fill={on ? "currentColor" : "none"}
      />
    </button>
  );
}
