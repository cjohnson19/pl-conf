"use client";

import { useState } from "react";
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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label={`Add ${event.abbreviation} to calendar`}
        title="Add to calendar"
        className={label ? labeledTriggerClass : triggerClass}
      >
        <Calendar size={label ? 15 : 14} strokeWidth={1.75} />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-[280px] rounded-lg p-1"
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
