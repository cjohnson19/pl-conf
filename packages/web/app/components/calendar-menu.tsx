"use client";

import { Calendar, Check, Copy, Download, Rss } from "lucide-react";
import clsx from "clsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  ExportMenuItem,
  MenuRowContent,
  menuItemClass,
} from "./export-menu-item";
import { useCalendarExport } from "../lib/use-calendar-export";
import type { ScheduledEvent } from "../lib/event";

export function CalendarMenu({ event }: { event: ScheduledEvent }) {
  const {
    datesTBD,
    setHasOpened,
    includeDeadlines,
    setIncludeDeadlines,
    copied,
    copyFeedUrl,
    icsUrl,
    fileName,
    gcalHref,
    subscribeUrls,
  } = useCalendarExport(event);

  if (datesTBD) {
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
        if (o) setHasOpened(true);
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
        <label className="mx-1 mt-1 flex cursor-pointer items-center justify-between gap-3 rounded-md border border-rule px-3 py-2 text-[12px] text-ink-2 hover:bg-paper-2">
          <span className="flex flex-col gap-0.5">
            <span>Include submission deadlines</span>
            <span className="font-mono text-[10px] text-ink-3">
              in exports & subscriptions
            </span>
          </span>
          <input
            type="checkbox"
            checked={includeDeadlines}
            onChange={(e) => setIncludeDeadlines(e.target.checked)}
            className="h-3.5 w-3.5 shrink-0 accent-ink"
            onClick={(e) => e.stopPropagation()}
          />
        </label>
        <div className="px-3 pb-1 pt-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
          Add to calendar
        </div>
        {gcalHref && (
          <ExportMenuItem
            href={gcalHref}
            title="Google Calendar"
            sub="Prefilled event form"
            icon={<Calendar size={14} strokeWidth={1.75} />}
          />
        )}
        {icsUrl && (
          <ExportMenuItem
            href={icsUrl}
            title="Download .ics"
            sub={fileName}
            icon={<Download size={14} strokeWidth={1.75} />}
            download={fileName}
          />
        )}
        {subscribeUrls && (
          <>
            <DropdownMenuSeparator className="mx-1.5 bg-rule" />
            <div className="px-3 pb-1 pt-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
              Subscribe (auto-updates)
            </div>
            <ExportMenuItem
              href={subscribeUrls.webcalUrl}
              title="Subscribe in default app"
              sub="Opens your calendar app"
              icon={<Rss size={14} strokeWidth={1.75} />}
            />
            <ExportMenuItem
              href={subscribeUrls.googleSubscribeUrl}
              title="Subscribe in Google Calendar"
              sub="Add by URL"
              icon={<Calendar size={14} strokeWidth={1.75} />}
            />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                copyFeedUrl();
              }}
              className={menuItemClass}
            >
              <div className="flex items-center gap-2.5">
                <MenuRowContent
                  icon={
                    copied ? (
                      <Check size={14} strokeWidth={1.75} />
                    ) : (
                      <Copy size={14} strokeWidth={1.75} />
                    )
                  }
                  title={copied ? "Copied" : "Copy feed URL"}
                  sub={
                    copied
                      ? "URL on clipboard"
                      : "Paste into Outlook, Notion, …"
                  }
                />
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
