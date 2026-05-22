"use client";

import { useMemo } from "react";
import { Calendar, HelpCircle, Star } from "lucide-react";
import { events } from "@pl-conf/data";
import { isActive } from "@pl-conf/core";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";

export function HelpPopover() {
  const totalActive = useMemo(
    () => Object.values(events).filter(isActive).length,
    []
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="How this site works"
          title="How this site works"
          className="grid h-11 w-11 place-items-center rounded-pill text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink data-[state=open]:bg-paper-2 data-[state=open]:text-ink sm:h-[34px] sm:w-[34px]"
        >
          <HelpCircle size={17} strokeWidth={1.75} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(360px,calc(100vw-2rem))] border-rule p-5 shadow-pop"
        style={{ background: "var(--card)" }}
      >
        <p className="font-display text-[15px] leading-[1.45] text-ink-2 sm:text-[16px]">
          A small index of{" "}
          <span className="not-italic font-medium text-ink">{totalActive}</span>{" "}
          programming-language conferences, workshops, and symposia.
        </p>

        <div className="mt-4 space-y-4 border-t border-rule pt-4">
          <HelpStep
            icon={<Star size={18} strokeWidth={1.75} fill="currentColor" />}
            title="Star events to keep track of their deadlines."
            sub="Tap the star on any row to follow it — your list stays in this browser."
          />
          <HelpStep
            icon={<Calendar size={18} strokeWidth={1.75} />}
            title="Subscribe to keep their dates in your calendar."
            sub="Use the calendar icon for a Google Calendar link, an .ics download, or a live feed."
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function HelpStep({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        aria-hidden
        className="grid h-9 w-9 shrink-0 place-items-center rounded-pill"
        style={{
          background: "color-mix(in srgb, var(--accent) 14%, var(--card))",
          color: "var(--accent)",
        }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[14px] font-medium leading-[1.3] text-ink">
          {title}
        </p>
        <p className="mt-1 text-[12px] leading-[1.5] text-ink-2">{sub}</p>
      </div>
    </div>
  );
}
