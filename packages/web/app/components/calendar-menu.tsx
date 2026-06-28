"use client";

import { Suspense, lazy, useState } from "react";
import { Calendar } from "lucide-react";
import clsx from "clsx";
import { hasConcreteDates } from "../lib/event";
import type { DisplayEvent } from "../lib/event-list-view";

const importPopover = () => import("./calendar-menu-popover");
const CalendarMenuPopover = lazy(() =>
  importPopover().then((m) => ({ default: m.CalendarMenuPopover }))
);

function preloadPopover() {
  void importPopover();
  void import("@pl-conf/core/ical");
}

if (typeof window !== "undefined") {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(preloadPopover);
  } else {
    setTimeout(preloadPopover, 200);
  }
}

export const triggerClass = clsx(
  "grid h-11 w-11 shrink-0 place-items-center border-0 bg-transparent text-ink-3 outline-none transition-colors sm:h-8 sm:w-8",
  "hover:text-ink data-[state=open]:text-ink"
);

export const labeledTriggerClass = clsx(
  "inline-flex h-9 items-center gap-2 rounded-xs border border-rule bg-transparent px-3 font-ui text-[13px] font-medium text-ink-2 outline-none transition-colors",
  "hover:border-ink hover:text-ink data-[state=open]:border-ink data-[state=open]:text-ink"
);

export function CalendarMenu({
  event,
  label,
}: {
  event: DisplayEvent;
  label?: string;
}) {
  const [opened, setOpened] = useState(false);

  if (!hasConcreteDates(event)) {
    return (
      <button
        type="button"
        disabled
        aria-label="Add to calendar (dates TBD)"
        title="Dates TBD"
        className={clsx(
          "cursor-not-allowed text-ink-3 opacity-40",
          label
            ? "inline-flex h-9 items-center gap-2 rounded-xs border border-rule px-3 font-ui text-[13px] font-medium"
            : "grid h-11 w-11 shrink-0 place-items-center border-0 bg-transparent sm:h-8 sm:w-8"
        )}
      >
        <Calendar size={label ? 15 : 14} strokeWidth={1.75} />
        {label}
      </button>
    );
  }

  const trigger = (
    <button
      type="button"
      onClick={() => setOpened(true)}
      onMouseEnter={preloadPopover}
      onFocus={preloadPopover}
      aria-label={`Add ${event.abbreviation} to calendar`}
      title="Add to calendar"
      className={label ? labeledTriggerClass : triggerClass}
    >
      <Calendar size={label ? 15 : 14} strokeWidth={1.75} />
      {label}
    </button>
  );

  if (!opened) return trigger;

  return (
    <Suspense fallback={trigger}>
      <CalendarMenuPopover event={event} label={label} />
    </Suspense>
  );
}
