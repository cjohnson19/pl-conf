"use client";

import clsx from "clsx";
import { Calendar, Check, Copy, Download, Rss } from "lucide-react";
import type { useCalendarExport } from "../lib/use-calendar-export";

export type ExportVariant = "sheet" | "menu";

export type ExportItemProps = {
  href: string;
  download?: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
};

export type CopyItemProps = {
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
};

export type ExportSlots = {
  Item: React.ComponentType<ExportItemProps>;
  CopyItem: React.ComponentType<CopyItemProps>;
  Separator: React.ComponentType;
};

type ExportData = ReturnType<typeof useCalendarExport>;

export function ExportRowContent({
  variant,
  icon,
  title,
  sub,
}: {
  variant: ExportVariant;
  icon: React.ReactNode;
  title: React.ReactNode;
  sub: React.ReactNode;
}) {
  return (
    <>
      <span
        className={clsx(
          "grid shrink-0 place-items-center rounded-sm",
          variant === "sheet" ? "h-9 w-9 text-ink-3" : "h-[22px] w-[22px]"
        )}
        style={{ background: "var(--paper-2)" }}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span
          className={clsx(
            "font-medium text-ink",
            variant === "sheet" ? "text-[14px]" : "text-[13px]"
          )}
        >
          {title}
        </span>
        <span className="font-mono text-[11px] tracking-[0.02em] text-ink-3">
          {sub}
        </span>
      </span>
    </>
  );
}

export function ExportOptions({
  variant,
  data,
  slots,
}: {
  variant: ExportVariant;
  data: ExportData;
  slots: ExportSlots;
}) {
  const {
    datesTBD,
    includeDeadlines,
    setIncludeDeadlines,
    copied,
    copyFeedUrl,
    icsUrl,
    fileName,
    gcalHref,
    subscribeUrls,
  } = data;

  if (datesTBD) {
    return (
      <div className="px-3 py-3 text-[13px] text-ink-3">
        Calendar export unavailable — dates TBD.
      </div>
    );
  }

  const iconSize = variant === "sheet" ? 18 : 14;
  const { Item, CopyItem, Separator } = slots;

  return (
    <>
      <IncludeDeadlinesToggle
        variant={variant}
        checked={includeDeadlines}
        onChange={setIncludeDeadlines}
      />
      <SectionHeading variant={variant}>Add to calendar</SectionHeading>
      {gcalHref && (
        <Item
          href={gcalHref}
          icon={<Calendar size={iconSize} strokeWidth={1.75} />}
          title="Google Calendar"
          sub="Prefilled event form"
        />
      )}
      {icsUrl && (
        <Item
          href={icsUrl}
          download={fileName}
          icon={<Download size={iconSize} strokeWidth={1.75} />}
          title="Download .ics"
          sub={fileName}
        />
      )}
      {subscribeUrls && (
        <>
          <Separator />
          <SectionHeading variant={variant}>
            Subscribe (auto-updates)
          </SectionHeading>
          <Item
            href={subscribeUrls.webcalUrl}
            icon={<Rss size={iconSize} strokeWidth={1.75} />}
            title="Subscribe in default app"
            sub="Opens your calendar app"
          />
          <Item
            href={subscribeUrls.googleSubscribeUrl}
            icon={<Calendar size={iconSize} strokeWidth={1.75} />}
            title="Subscribe in Google Calendar"
            sub="Add by URL"
          />
          <CopyItem
            onSelect={copyFeedUrl}
            icon={
              copied ? (
                <Check size={iconSize} strokeWidth={1.75} />
              ) : (
                <Copy size={iconSize} strokeWidth={1.75} />
              )
            }
            title={copied ? "Copied" : "Copy feed URL"}
            sub={copied ? "URL on clipboard" : "Paste into Outlook, Notion, …"}
          />
        </>
      )}
    </>
  );
}

function IncludeDeadlinesToggle({
  variant,
  checked,
  onChange,
}: {
  variant: ExportVariant;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const isSheet = variant === "sheet";
  return (
    <label
      className={clsx(
        "flex cursor-pointer items-center justify-between gap-3 rounded-md border border-rule text-ink-2 hover:bg-paper-2",
        isSheet
          ? "mx-2 mt-2 px-3 py-2.5 text-[13px]"
          : "mx-1 mt-1 px-3 py-2 text-[12px]"
      )}
    >
      <span className="flex flex-col gap-0.5">
        <span>Include submission deadlines</span>
        <span
          className={clsx(
            "font-mono text-ink-3",
            isSheet ? "text-[11px]" : "text-[10px]"
          )}
        >
          in exports & subscriptions
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={clsx(
          "shrink-0 accent-ink",
          isSheet ? "h-4 w-4" : "h-3.5 w-3.5"
        )}
        onClick={isSheet ? undefined : (e) => e.stopPropagation()}
      />
    </label>
  );
}

function SectionHeading({
  variant,
  children,
}: {
  variant: ExportVariant;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "px-3 pb-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3",
        variant === "sheet" ? "pt-3" : "pt-2"
      )}
    >
      {children}
    </div>
  );
}
