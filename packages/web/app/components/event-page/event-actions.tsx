"use client";

import clsx from "clsx";
import { Star } from "lucide-react";
import { useFavorite } from "../../hooks/use-favorite";
import type { DisplayEvent } from "../../lib/event-list-view";
import { CalendarMenu } from "../calendar-menu";

export function EventActions({
  event,
  prefKey,
}: {
  event: DisplayEvent;
  prefKey: string;
}) {
  const { on, toggle } = useFavorite(prefKey);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={on}
        aria-label={
          on ? `Unstar ${event.abbreviation}` : `Star ${event.abbreviation}`
        }
        onClick={toggle}
        className={clsx(
          "inline-flex h-9 items-center gap-2 rounded-xs border bg-transparent px-3 font-ui text-[13px] font-medium outline-none transition-colors",
          on
            ? "border-accent text-accent"
            : "border-rule text-ink-2 hover:border-ink hover:text-ink"
        )}
      >
        <Star
          size={15}
          strokeWidth={1.75}
          fill={on ? "currentColor" : "none"}
        />
        {on ? "Starred" : "Star this event"}
      </button>
      <CalendarMenu event={event} label="Add to calendar" />
    </div>
  );
}
