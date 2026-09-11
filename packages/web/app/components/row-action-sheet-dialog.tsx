"use client";

import { useState } from "react";
import { MoreHorizontal, Star } from "lucide-react";
import clsx from "clsx";
import type { DisplayEvent } from "../lib/event-list-view";
import { useCalendarExport } from "../hooks/use-calendar-export";
import { useFavorite } from "../hooks/use-favorite";
import { CalendarSheet } from "./calendar-sheet";
import { triggerClass } from "./row-action-sheet";

export function RowActionSheetDialog({
  event,
  prefKey,
}: {
  event: DisplayEvent;
  prefKey: string;
}) {
  // Rendered only when the sheet should be open.
  const [open, setOpen] = useState(true);
  const { on: starred, toggle: toggleStar } = useFavorite(prefKey);
  const data = useCalendarExport(event);

  return (
    <CalendarSheet
      event={event}
      data={data}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button
          type="button"
          aria-label={`Actions for ${event.abbreviation}`}
          title="Actions"
          className={triggerClass}
        >
          <MoreHorizontal size={16} strokeWidth={1.75} />
        </button>
      }
    >
      <button
        type="button"
        onClick={toggleStar}
        className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-[14px] hover:bg-paper-2"
      >
        <span
          className={clsx(
            "grid h-9 w-9 place-items-center rounded-sm bg-paper-2",
            starred ? "text-accent" : "text-ink-3"
          )}
        >
          <Star
            size={18}
            strokeWidth={1.75}
            fill={starred ? "currentColor" : "none"}
          />
        </span>
        <span className="flex-1 font-medium text-ink">
          {starred ? "Unstar" : "Star this event"}
        </span>
      </button>
      <div className="my-1 h-px bg-rule" />
    </CalendarSheet>
  );
}
