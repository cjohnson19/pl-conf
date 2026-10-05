"use client";

import clsx from "clsx";
import {
  anyVisible,
  deferredComponent,
  useDeferred,
} from "../lib/deferred-component";
import { hasConcreteDates } from "../lib/event";
import type { DisplayEvent } from "../lib/event-list-view";
import { Calendar } from "lucide-react";
import { rowIconButtonClass } from "./icon-button";

type PopoverProps = { event: DisplayEvent; label?: string };

const popover = deferredComponent<PopoverProps>(() =>
  import("./calendar-menu-popover").then((m) => m.CalendarMenuPopover)
);

const TRIGGER_SELECTOR =
  'button[aria-label^="Add "][aria-label$=" to calendar"]';

// List rows hide this below 680px in favour of RowActionSheet, but the grid
// layout and the event pages render it at every width — so ask the rendered
// trigger rather than assuming a viewport.
popover.preloadWhenIdle(() => anyVisible(TRIGGER_SELECTOR));

export const triggerClass = clsx(
  rowIconButtonClass,
  "text-ink-3 outline-none hover:text-ink data-[state=open]:text-ink"
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
  const { Component: Popover, open, warm } = useDeferred(popover);

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

  if (Popover) return <Popover event={event} label={label} />;

  return (
    <button
      type="button"
      onClick={open}
      onPointerDown={warm}
      onMouseEnter={warm}
      onFocus={warm}
      aria-label={`Add ${event.abbreviation} to calendar`}
      title="Add to calendar"
      className={label ? labeledTriggerClass : triggerClass}
    >
      <Calendar size={label ? 15 : 14} strokeWidth={1.75} />
      {label}
    </button>
  );
}
