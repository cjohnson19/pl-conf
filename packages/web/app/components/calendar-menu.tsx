"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Calendar } from "lucide-react";
import clsx from "clsx";
import { hasConcreteDates } from "../lib/event";
import type { DisplayEvent } from "../lib/event-list-view";

const CalendarMenuPopover = dynamic(
  () =>
    import("./calendar-menu-popover").then((m) => ({
      default: m.CalendarMenuPopover,
    })),
  { ssr: false }
);

const triggerClass = clsx(
  "grid h-11 w-11 shrink-0 place-items-center border-0 bg-transparent text-ink-3 outline-none transition-colors sm:h-8 sm:w-8",
  "hover:text-ink data-[state=open]:text-ink"
);

export function CalendarMenu({ event }: { event: DisplayEvent }) {
  const [opened, setOpened] = useState(false);

  if (!hasConcreteDates(event)) {
    return (
      <button
        type="button"
        disabled
        aria-label="Add to calendar (dates TBD)"
        title="Dates TBD"
        className="grid h-11 w-11 shrink-0 cursor-not-allowed place-items-center border-0 bg-transparent text-ink-3 opacity-40 sm:h-8 sm:w-8"
      >
        <Calendar size={14} strokeWidth={1.75} />
      </button>
    );
  }

  if (!opened) {
    return (
      <button
        type="button"
        onClick={() => setOpened(true)}
        aria-label={`Add ${event.abbreviation} to calendar`}
        title="Add to calendar"
        className={triggerClass}
      >
        <Calendar size={14} strokeWidth={1.75} />
      </button>
    );
  }

  return <CalendarMenuPopover event={event} />;
}
