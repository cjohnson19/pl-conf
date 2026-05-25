"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MoreHorizontal } from "lucide-react";
import clsx from "clsx";
import type { DisplayEvent } from "../lib/event-list-view";

const RowActionSheetDialog = dynamic(
  () =>
    import("./row-action-sheet-dialog").then((m) => ({
      default: m.RowActionSheetDialog,
    })),
  { ssr: false }
);

const triggerClass = clsx(
  "grid h-11 w-11 shrink-0 place-items-center rounded-pill border border-rule bg-transparent text-ink-2 transition-colors",
  "hover:border-ink hover:bg-ink hover:text-paper data-[state=open]:border-ink data-[state=open]:bg-ink data-[state=open]:text-paper"
);

export function RowActionSheet({
  event,
  prefKey,
}: {
  event: DisplayEvent;
  prefKey: string;
}) {
  const [opened, setOpened] = useState(false);

  if (!opened) {
    return (
      <button
        type="button"
        onClick={() => setOpened(true)}
        aria-label={`Actions for ${event.abbreviation}`}
        title="Actions"
        className={triggerClass}
      >
        <MoreHorizontal size={16} strokeWidth={1.75} />
      </button>
    );
  }

  return <RowActionSheetDialog event={event} prefKey={prefKey} />;
}
