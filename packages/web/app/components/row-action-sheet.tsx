"use client";

import { type ComponentType, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import clsx from "clsx";
import { anyVisible, deferredComponent } from "../lib/deferred-component";
import type { DisplayEvent } from "../lib/event-list-view";

type SheetProps = { event: DisplayEvent; prefKey: string };

const sheet = deferredComponent<SheetProps>(() =>
  import("./row-action-sheet-dialog").then((m) => m.RowActionSheetDialog)
);

const ACTIONS_LABEL = "Actions for";
const TRIGGER_SELECTOR = `button[aria-label^="${ACTIONS_LABEL} "]`;

// Whether a row shows this sheet or CalendarMenu comes from a container query
// on the row itself, and the grid layout renders CalendarMenu at every width —
// no media query mirrors that. Ask the rendered trigger instead, so a narrow
// desktop window preloads and a wide tablet doesn't.
sheet.preloadWhenIdle(() => anyVisible(TRIGGER_SELECTOR));

const triggerClass = clsx(
  "grid h-11 w-11 shrink-0 place-items-center rounded-pill border border-rule bg-transparent text-ink-2 transition-colors",
  "hover:border-ink hover:bg-ink hover:text-paper data-[state=open]:border-ink data-[state=open]:bg-ink data-[state=open]:text-paper"
);

export function RowActionSheet({ event, prefKey }: SheetProps) {
  const [Sheet, setSheet] = useState<ComponentType<SheetProps> | undefined>(
    undefined
  );

  if (Sheet) return <Sheet event={event} prefKey={prefKey} />;

  const open = () => {
    const ready = sheet.loaded();
    if (ready) setSheet(() => ready);
    else
      void sheet.load().then((c) => {
        if (c) setSheet(() => c);
      });
  };

  // Warm on the events that precede activation, covering the cases the
  // once-evaluated idle predicate misses (rotation, resize, filter change).
  const warm = () => void sheet.load();

  return (
    <button
      type="button"
      onClick={open}
      onPointerDown={warm}
      onFocus={warm}
      aria-label={`${ACTIONS_LABEL} ${event.abbreviation}`}
      title="Actions"
      className={triggerClass}
    >
      <MoreHorizontal size={16} strokeWidth={1.75} />
    </button>
  );
}
