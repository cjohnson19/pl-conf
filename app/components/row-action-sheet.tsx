"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Calendar,
  Check,
  Copy,
  Download,
  MoreHorizontal,
  Rss,
  Star,
  X,
} from "lucide-react";
import clsx from "clsx";
import type { ScheduledEvent } from "../lib/event";
import { useCalendarExport } from "../lib/use-calendar-export";
import { useFavorite } from "../lib/use-favorite";

export function RowActionSheet({
  event,
  prefKey,
}: {
  event: ScheduledEvent;
  prefKey: string;
}) {
  const [open, setOpen] = useState(false);
  const { on: starred, toggle: toggleStar } = useFavorite(prefKey);
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

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setHasOpened(true);
      }}
    >
      <Dialog.Trigger
        aria-label={`Actions for ${event.abbreviation}`}
        title="Actions"
        className={clsx(
          "grid h-11 w-11 shrink-0 place-items-center rounded-pill border border-rule bg-transparent text-ink-2 transition-colors",
          "hover:border-ink hover:bg-ink hover:text-paper data-[state=open]:border-ink data-[state=open]:bg-ink data-[state=open]:text-paper"
        )}
      >
        <MoreHorizontal size={16} strokeWidth={1.75} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          className={clsx(
            "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200"
          )}
        />
        <Dialog.Content
          aria-describedby={undefined}
          className={clsx(
            "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-rule p-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-pop",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-200"
          )}
          style={{ background: "var(--card)" }}
        >
          <div className="flex items-center justify-between px-3 py-2">
            <Dialog.Title asChild>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="font-ui text-[18px] font-bold normal-case leading-none tracking-[-0.015em] text-ink">
                  {event.abbreviation}
                </div>
                <div className="truncate text-[12px] font-normal normal-case tracking-normal text-ink-2">
                  {event.name}
                </div>
              </div>
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-paper-2"
            >
              <X size={16} strokeWidth={1.75} />
            </Dialog.Close>
          </div>

          <button
            type="button"
            onClick={toggleStar}
            className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-[14px] hover:bg-paper-2"
          >
            <span
              className={clsx(
                "grid h-9 w-9 place-items-center rounded-sm",
                starred ? "text-[color:var(--accent)]" : "text-ink-3"
              )}
              style={{ background: "var(--paper-2)" }}
            >
              <Star
                size={18}
                strokeWidth={1.75}
                fill={starred ? "currentColor" : "none"}
              />
            </span>
            <span className="flex-1 font-medium text-ink">
              {starred ? "Unstar" : "Star this event"}
            </span>
          </button>

          <div className="my-1 h-px bg-rule" />

          {datesTBD ? (
            <div className="px-3 py-3 text-[13px] text-ink-3">
              Calendar export unavailable — dates TBD.
            </div>
          ) : (
            <>
              <label className="mx-2 mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-md border border-rule px-3 py-2.5 text-[13px] text-ink-2 hover:bg-paper-2">
                <span className="flex flex-col gap-0.5">
                  <span>Include submission deadlines</span>
                  <span className="font-mono text-[11px] text-ink-3">
                    in exports & subscriptions
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={includeDeadlines}
                  onChange={(e) => setIncludeDeadlines(e.target.checked)}
                  className="h-4 w-4 shrink-0 accent-ink"
                />
              </label>
              <div className="px-3 pb-1 pt-3 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
                Add to calendar
              </div>
              {gcalHref && (
                <SheetLink
                  href={gcalHref}
                  icon={<Calendar size={18} strokeWidth={1.75} />}
                  title="Google Calendar"
                  sub="Prefilled event form"
                />
              )}
              {icsUrl && (
                <SheetLink
                  href={icsUrl}
                  download={fileName}
                  icon={<Download size={18} strokeWidth={1.75} />}
                  title="Download .ics"
                  sub={fileName}
                />
              )}
              {subscribeUrls && (
                <>
                  <div className="my-1 h-px bg-rule" />
                  <div className="px-3 pb-1 pt-3 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3">
                    Subscribe (auto-updates)
                  </div>
                  <SheetLink
                    href={subscribeUrls.webcalUrl}
                    icon={<Rss size={18} strokeWidth={1.75} />}
                    title="Subscribe in default app"
                    sub="Opens your calendar app"
                  />
                  <SheetLink
                    href={subscribeUrls.googleSubscribeUrl}
                    icon={<Calendar size={18} strokeWidth={1.75} />}
                    title="Subscribe in Google Calendar"
                    sub="Add by URL"
                  />
                  <button
                    type="button"
                    onClick={copyFeedUrl}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-paper-2"
                  >
                    <SheetRowContent
                      icon={
                        copied ? (
                          <Check size={18} strokeWidth={1.75} />
                        ) : (
                          <Copy size={18} strokeWidth={1.75} />
                        )
                      }
                      title={copied ? "Copied" : "Copy feed URL"}
                      sub={
                        copied
                          ? "URL on clipboard"
                          : "Paste into Outlook, Notion, …"
                      }
                    />
                  </button>
                </>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SheetRowContent({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  sub: React.ReactNode;
}) {
  return (
    <>
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-sm text-ink-3"
        style={{ background: "var(--paper-2)" }}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-[14px] font-medium text-ink">{title}</span>
        <span className="font-mono text-[11px] tracking-[0.02em] text-ink-3">
          {sub}
        </span>
      </span>
    </>
  );
}

function SheetLink({
  href,
  download,
  icon,
  title,
  sub,
}: {
  href: string;
  download?: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <Dialog.Close asChild>
      <a
        href={href}
        target={download ? undefined : "_blank"}
        rel={download ? undefined : "noopener noreferrer"}
        download={download}
        className="flex items-center gap-3 rounded-md px-3 py-2.5 no-underline hover:bg-paper-2"
      >
        <SheetRowContent icon={icon} title={title} sub={sub} />
      </a>
    </Dialog.Close>
  );
}
