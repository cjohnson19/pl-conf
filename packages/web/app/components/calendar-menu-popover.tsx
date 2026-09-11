"use client";

import { useState, useSyncExternalStore } from "react";
import { Calendar } from "lucide-react";
import { labeledTriggerClass, triggerClass } from "./calendar-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  type CopyItemProps,
  type ExportItemProps,
  ExportOptions,
  ExportRowContent,
} from "./export-options";
import { useCalendarExport } from "../hooks/use-calendar-export";
import type { DisplayEvent } from "../lib/event-list-view";
import { CalendarSheet } from "./calendar-sheet";

const DESKTOP_QUERY = "(min-width: 680px)";

function subscribeToViewport(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const isMobileViewport = () => !window.matchMedia(DESKTOP_QUERY).matches;

const itemClass = "cursor-pointer rounded-md px-3 py-2.5 text-[13px] text-ink";

function MenuItem({ href, download, icon, title, sub }: ExportItemProps) {
  return (
    <DropdownMenuItem asChild className={itemClass}>
      <a
        href={href}
        target={download ? undefined : "_blank"}
        download={download}
        className="flex items-center gap-2.5 no-underline"
      >
        <ExportRowContent variant="menu" icon={icon} title={title} sub={sub} />
      </a>
    </DropdownMenuItem>
  );
}

function MenuCopyItem({ onSelect, icon, title, sub }: CopyItemProps) {
  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        onSelect();
      }}
      className={itemClass}
    >
      <div className="flex items-center gap-2.5">
        <ExportRowContent variant="menu" icon={icon} title={title} sub={sub} />
      </div>
    </DropdownMenuItem>
  );
}

function MenuSeparator() {
  return <DropdownMenuSeparator className="mx-1.5" />;
}

export function CalendarMenuPopover({
  event,
  label,
}: {
  event: DisplayEvent;
  label?: string;
}) {
  const data = useCalendarExport(event);
  // Rendered only when the menu should be open.
  const [open, setOpen] = useState(true);
  const mobile = useSyncExternalStore(
    subscribeToViewport,
    isMobileViewport,
    () => false
  );
  const trigger = (
    <button
      type="button"
      aria-label={`Add ${event.abbreviation} to calendar`}
      title="Add to calendar"
      className={label ? labeledTriggerClass : triggerClass}
    >
      <Calendar size={label ? 15 : 14} strokeWidth={1.75} />
      {label}
    </button>
  );

  if (mobile) {
    return (
      <CalendarSheet
        event={event}
        data={data}
        trigger={trigger}
        open={open}
        onOpenChange={setOpen}
      />
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        collisionPadding={8}
        className="max-h-[var(--radix-dropdown-menu-content-available-height)] w-[280px] overflow-y-auto overscroll-contain rounded-lg p-1"
      >
        <ExportOptions
          variant="menu"
          data={data}
          slots={{
            Item: MenuItem,
            CopyItem: MenuCopyItem,
            Separator: MenuSeparator,
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
