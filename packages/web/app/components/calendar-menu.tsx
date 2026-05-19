"use client";

import { Calendar } from "lucide-react";
import clsx from "clsx";
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
import { useCalendarExport } from "../lib/use-calendar-export";
import type { ScheduledEvent } from "../lib/event";

const itemClass =
  "cursor-pointer rounded-md px-3 py-2.5 text-[13px] text-ink focus:bg-paper-2 focus:text-ink";

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
  return <DropdownMenuSeparator className="mx-1.5 bg-rule" />;
}

export function CalendarMenu({ event }: { event: ScheduledEvent }) {
  const data = useCalendarExport(event);

  if (data.datesTBD) {
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

  return (
    <DropdownMenu
      onOpenChange={(o) => {
        if (o) data.setHasOpened(true);
      }}
    >
      <DropdownMenuTrigger
        aria-label={`Add ${event.abbreviation} to calendar`}
        title="Add to calendar"
        className={clsx(
          "grid h-11 w-11 shrink-0 place-items-center border-0 bg-transparent text-ink-3 outline-none transition-colors sm:h-8 sm:w-8",
          "hover:text-ink data-[state=open]:text-ink"
        )}
      >
        <Calendar size={14} strokeWidth={1.75} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-[280px] rounded-lg border border-rule p-1 shadow-pop"
        style={{ background: "var(--card)" }}
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
