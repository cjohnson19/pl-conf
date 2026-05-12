"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { ArrowUpRight } from "lucide-react";
import {
  type DateName,
  type MaybeDate,
  type Round,
  type ScheduledEvent,
  allDeadlines,
  eventKey,
  formatDate,
  formatDateRange,
  isDeadline,
  isDeadlinePast,
  isDeadlineUrgent,
  toAoeInstant,
  toCalendarDate,
} from "../lib/event";
import { shortCountdown } from "../lib/countdown";
import { FavoriteButton } from "./favorite-button";
import { CalendarMenu } from "./calendar-menu";
import { RowActionSheet } from "./row-action-sheet";

type LeadInfo = {
  roundIdx: number;
  name: DateName;
  date: string;
  time: number;
};

function findLead(e: ScheduledEvent, now: Date): LeadInfo | null {
  const nowTime = now.getTime();
  let upcoming: LeadInfo | null = null;
  let fallback: LeadInfo | null = null;
  e.rounds.forEach((r, roundIdx) => {
    (Object.entries(r.importantDates) as Array<[DateName, MaybeDate]>).forEach(
      ([name, date]) => {
        if (date === "TBD") return;
        const instant = toAoeInstant(date);
        if (!instant) return;
        const time = instant.getTime();
        const candidate = { roundIdx, name, date, time };
        if (time > nowTime) {
          if (!upcoming || time < upcoming.time) upcoming = candidate;
        } else {
          if (!fallback || time > fallback.time) fallback = candidate;
        }
      }
    );
  });
  return upcoming ?? fallback;
}

const monthYearFmt = new Intl.DateTimeFormat(undefined, {
  month: "short",
  year: "numeric",
});
const monthShortFmt = new Intl.DateTimeFormat(undefined, { month: "short" });
const monthDayFmt = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

function eventStatusMessage(
  e: ScheduledEvent,
  now: Date
): { label: string; when?: string } {
  if (e.date.start === "TBD") return { label: "Submissions closed" };
  const startInstant = toAoeInstant(e.date.start);
  const endInstant =
    e.date.end !== "TBD" ? toAoeInstant(e.date.end) : startInstant;
  const startCalendar = toCalendarDate(e.date.start);
  if (endInstant && endInstant.getTime() < now.getTime()) {
    return {
      label: "Concluded",
      when: startCalendar ? monthYearFmt.format(startCalendar) : undefined,
    };
  }
  if (startInstant && startInstant.getTime() <= now.getTime()) {
    return { label: "Happening now" };
  }
  return { label: "Submissions closed" };
}

function dateNameShort(n: DateName): string {
  switch (n) {
    case "paper":
      return "Paper";
    case "abstract":
      return "Abstract";
    case "notification":
      return "Notification";
    case "rebuttal":
      return "Rebuttal";
    case "conditional-acceptance":
      return "Conditional";
    case "camera-ready":
      return "Camera-ready";
    case "revisions":
      return "Revisions";
  }
}

function monthShort(date: MaybeDate): string {
  if (date === "TBD") return "TBD";
  const cal = toCalendarDate(date);
  return cal ? monthShortFmt.format(cal) : "TBD";
}

function dayNum(date: MaybeDate): string {
  if (date === "TBD") return "—";
  const cal = toCalendarDate(date);
  return cal ? cal.getDate().toString() : "—";
}

function yearNum(date: MaybeDate): string {
  if (date === "TBD") return "";
  const cal = toCalendarDate(date);
  return cal ? cal.getFullYear().toString() : "";
}

function typeColor(t: ScheduledEvent["type"]): string {
  switch (t) {
    case "conference":
      return "text-[color:var(--accent)]";
    case "workshop":
      return "text-hot";
    case "symposium":
      return "text-ink-2";
  }
}

function typeLabel(t: ScheduledEvent["type"]): string {
  switch (t) {
    case "conference":
      return "Conference";
    case "workshop":
      return "Workshop";
    case "symposium":
      return "Symposium";
  }
}

function roundShortDate(date: MaybeDate): string {
  if (date === "TBD") return "TBD";
  const cal = toCalendarDate(date);
  return cal ? monthDayFmt.format(cal) : "TBD";
}

type ChipKind = "past" | "next" | "default";

type RailRow = { name: DateName; date: MaybeDate; kind: ChipKind };

function buildRoundRows(
  round: Round,
  now: Date,
  activeNext?: DateName
): RailRow[] {
  const entries = (
    Object.entries(round.importantDates) as Array<[DateName, MaybeDate]>
  )
    .filter(([, d]) => d !== undefined)
    .sort(([, a], [, b]) => {
      if (a === "TBD") return 1;
      if (b === "TBD") return -1;
      return a < b ? -1 : 1;
    });
  return entries.map(([name, date]) => {
    if (date === "TBD") return { name, date, kind: "default" as ChipKind };
    if (isDeadlinePast(date, now))
      return { name, date, kind: "past" as ChipKind };
    if (activeNext && name === activeNext)
      return { name, date, kind: "next" as ChipKind };
    return { name, date, kind: "default" as ChipKind };
  });
}

export function EventRow({
  event: e,
  now,
}: {
  event: ScheduledEvent;
  now: Date;
}) {
  const lead = useMemo(() => findLead(e, now), [e, now]);

  const leadDate = lead?.date;
  const anchorDate: MaybeDate =
    leadDate ?? allDeadlines(e).find((d) => d !== undefined) ?? e.date.start;

  const passed = leadDate ? isDeadlinePast(leadDate, now) : false;
  const urgent = leadDate ? isDeadlineUrgent(leadDate, now) : false;

  const totalRounds = e.rounds.length;
  const showMultiRound =
    totalRounds > 1 &&
    e.rounds.some((r) =>
      Object.values(r.importantDates).some(
        (d) => d !== undefined && d !== "TBD" && isDeadlinePast(d, now)
      )
    ) &&
    e.rounds.some((r) =>
      Object.values(r.importantDates).some(
        (d) => d !== undefined && d !== "TBD" && !isDeadlinePast(d, now)
      )
    );

  const year2 = formatDate(e.date.start, "year2", "en-US");

  return (
    <div
      data-event-key={eventKey(e)}
      data-event-abbrev={e.abbreviation}
      className={clsx(
        "group grid items-center rounded-xs border-t border-rule",
        "[grid-template-columns:100px_minmax(0,1.6fr)_minmax(0,2fr)_104px]",
        "max-[1080px]:[grid-template-columns:80px_minmax(0,1.4fr)_minmax(0,1.5fr)_104px] max-[1080px]:gap-5",
        "max-[760px]:[grid-template-columns:56px_1fr_44px] max-[760px]:gap-3",
        "max-[420px]:[grid-template-columns:48px_1fr_44px] max-[420px]:gap-2.5",
        "gap-7 py-[22px] px-4 -mx-4 transition-colors",
        "hover:bg-[color-mix(in_srgb,var(--card)_70%,transparent)]",
        "last:border-b last:border-rule"
      )}
    >
      <div
        className={clsx(
          "flex flex-col items-start gap-1.5 max-[760px]:self-start",
          passed && "opacity-55"
        )}
      >
        <div
          className={clsx(
            "font-ui font-semibold leading-none tracking-[-0.025em] tabular-nums",
            "text-[32px] max-[760px]:text-[24px] max-[420px]:text-[22px]",
            urgent ? "text-hot" : "text-ink"
          )}
        >
          {dayNum(anchorDate)}
        </div>
        <div className="font-mono text-[11px] font-medium uppercase leading-none tracking-[0.08em] text-ink-2">
          {monthShort(anchorDate)}
        </div>
        <div className="font-mono text-[10px] font-medium leading-none tracking-[0.06em] text-ink-3">
          {yearNum(anchorDate)}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="inline-flex items-baseline gap-2 font-ui text-[22px] font-bold leading-none tracking-[-0.015em]">
          <span>{e.abbreviation}</span>
          <span className="font-mono text-[14px] font-medium text-ink-3">
            &rsquo;{year2}
          </span>
          {showMultiRound && (
            <span
              className="inline-flex h-[18px] items-center rounded-xs border px-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-[color:var(--accent)]"
              style={{ borderColor: "currentColor" }}
            >
              Round {(lead?.roundIdx ?? totalRounds - 1) + 1} / {totalRounds}
            </span>
          )}
        </div>
        {e.url ? (
          <a
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${e.abbreviation} website`}
            className="group/url flex min-w-0 items-baseline gap-1.5 text-[13px] text-ink-2 no-underline"
          >
            <span className="min-w-0 truncate underline decoration-rule decoration-1 underline-offset-[3px] transition-[text-decoration-color] duration-200 ease-out group-hover/url:decoration-ink">
              {e.name}
            </span>
            <ArrowUpRight
              size={11}
              strokeWidth={1.75}
              className="shrink-0 self-center text-ink-3 transition-all duration-200 ease-out group-hover/url:translate-x-0.5 group-hover/url:-translate-y-0.5 group-hover/url:text-ink"
              aria-hidden
            />
          </a>
        ) : (
          <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-ink-2">
            {e.name}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">
          <span
            className={clsx(
              "rounded-xs border px-1.5 py-0.5",
              typeColor(e.type)
            )}
            style={{ borderColor: "currentColor" }}
          >
            {typeLabel(e.type)}
          </span>
          {(() => {
            const items: { node: React.ReactNode; wideOnly: boolean }[] = [];
            if (e.location)
              items.push({
                node: <span className="text-ink-2">{e.location}</span>,
                wideOnly: false,
              });
            if (e.date.start !== "TBD" && e.date.end !== "TBD")
              items.push({
                node: (
                  <span>
                    {formatDateRange(e.date.start, e.date.end, "short")}
                  </span>
                ),
                wideOnly: false,
              });
            if (e.partOf.length > 0)
              items.push({
                node: (
                  <span>
                    part of{" "}
                    <b className="font-medium text-ink-2">
                      {e.partOf.join(", ")}
                    </b>
                  </span>
                ),
                wideOnly: true,
              });
            if (e.colocatedWith.length > 0)
              items.push({
                node: (
                  <span>
                    co-located{" "}
                    <b className="font-medium text-ink-2">
                      {e.colocatedWith.join(", ")}
                    </b>
                  </span>
                ),
                wideOnly: true,
              });
            return items.flatMap((item, i) => {
              const nodes: React.ReactNode[] = [];
              if (i > 0) {
                nodes.push(
                  <span
                    key={`sep-${i}`}
                    aria-hidden
                    className={clsx(
                      "text-ink-3/60",
                      item.wideOnly && "hidden min-[1280px]:inline"
                    )}
                  >
                    ·
                  </span>
                );
              }
              nodes.push(
                <span
                  key={`item-${i}`}
                  className={clsx(
                    item.wideOnly && "hidden min-[1280px]:inline"
                  )}
                >
                  {item.node}
                </span>
              );
              return nodes;
            });
          })()}
        </div>
        {lead &&
          (passed ? (
            <StatusLine size="mobile" status={eventStatusMessage(e, now)} />
          ) : (
            <LeadLine
              size="mobile"
              event={e}
              lead={lead}
              now={now}
              urgent={urgent}
              showMultiRound={showMultiRound}
            />
          ))}
        <div className="hidden pt-1 max-[760px]:block">
          <RoundRail
            event={e}
            now={now}
            lead={lead}
            passed={passed}
            showMultiRound={showMultiRound}
            totalRounds={totalRounds}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-1 text-[13px] max-[760px]:hidden">
        {passed && lead ? (
          <StatusLine size="desktop" status={eventStatusMessage(e, now)} />
        ) : lead ? (
          <LeadLine
            size="desktop"
            event={e}
            lead={lead}
            now={now}
            urgent={urgent}
            showMultiRound={showMultiRound}
          />
        ) : (
          <div className="font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">
            No deadlines tracked
          </div>
        )}

        <RoundRail
          event={e}
          now={now}
          lead={lead}
          passed={passed}
          showMultiRound={showMultiRound}
          totalRounds={totalRounds}
        />
      </div>

      <div className="flex items-center justify-end gap-1 max-[760px]:self-start">
        <div className="contents max-[760px]:hidden">
          <FavoriteButton prefKey={eventKey(e)} />
          <CalendarMenu event={e} />
        </div>
        <div className="hidden max-[760px]:contents">
          <RowActionSheet event={e} prefKey={eventKey(e)} />
        </div>
      </div>
    </div>
  );
}

function StatusLine({
  size,
  status,
}: {
  size: "mobile" | "desktop";
  status: { label: string; when?: string };
}) {
  return (
    <div
      className={clsx(
        "items-baseline",
        size === "mobile"
          ? "hidden gap-2 text-[12px] max-[760px]:flex"
          : "flex gap-2.5"
      )}
    >
      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-2">
        {status.label}
      </span>
      {status.when && (
        <span
          className={clsx(
            "font-mono text-[11px] text-ink-3",
            size === "desktop" && "tracking-[0.04em]"
          )}
        >
          {status.when}
        </span>
      )}
    </div>
  );
}

function LeadLine({
  size,
  event: e,
  lead,
  now,
  urgent,
  showMultiRound,
}: {
  size: "mobile" | "desktop";
  event: ScheduledEvent;
  lead: LeadInfo;
  now: Date;
  urgent: boolean;
  showMultiRound: boolean;
}) {
  const leadKindLabel = showMultiRound
    ? `R${lead.roundIdx + 1} ${dateNameShort(lead.name).toLowerCase()}`
    : dateNameShort(lead.name);
  const isMobile = size === "mobile";
  const inner = (
    <>
      <span
        className={clsx(
          "font-ui font-semibold leading-none tracking-[-0.01em] tabular-nums",
          isMobile ? "text-[13px]" : "text-[15px]",
          urgent ? "text-hot" : "text-[color:var(--accent)]"
        )}
      >
        {shortCountdown(lead.date, now)}
      </span>
      <span
        className={clsx(
          isMobile
            ? "min-w-0 truncate text-ink-2"
            : "font-normal text-ink-2 transition-[text-decoration-color] duration-200 ease-out",
          e.importantDateUrl &&
            (isMobile
              ? "underline decoration-rule decoration-1 underline-offset-[3px]"
              : "underline decoration-rule decoration-1 underline-offset-[3px] group-hover/lead:decoration-ink")
        )}
      >
        <b className="font-medium text-ink">{leadKindLabel}</b>
        {isDeadline(lead.name) ? " deadline" : ""}{" "}
        <span
          className={clsx(
            "font-mono tracking-[0.04em] text-ink-3",
            isMobile ? "text-[10px]" : "text-[11px]"
          )}
        >
          {roundShortDate(lead.date)} 23:59 AoE
        </span>
      </span>
      {e.importantDateUrl &&
        (isMobile ? (
          <ArrowUpRight
            size={10}
            strokeWidth={1.75}
            className="self-center text-ink-3"
            aria-hidden
          />
        ) : (
          <ArrowUpRight
            size={11}
            strokeWidth={1.75}
            className="-ml-1.5 self-center text-ink-3 transition-all duration-200 ease-out group-hover/lead:text-ink group-hover/lead:translate-x-0.5 group-hover/lead:-translate-y-0.5"
            aria-hidden
          />
        ))}
    </>
  );

  const mobileWrapper =
    "hidden items-baseline gap-2 text-[12px] max-[760px]:flex max-[760px]:py-2 max-[760px]:-my-2";
  const desktopWrapper = "flex items-baseline gap-2.5 font-medium text-ink";

  if (e.importantDateUrl) {
    return (
      <a
        href={e.importantDateUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View important dates"
        className={clsx(
          "no-underline",
          isMobile ? mobileWrapper : `group/lead ${desktopWrapper}`
        )}
      >
        {inner}
      </a>
    );
  }
  return (
    <div className={isMobile ? mobileWrapper : desktopWrapper}>{inner}</div>
  );
}

function RoundRail({
  event: e,
  now,
  lead,
  passed,
  showMultiRound,
  totalRounds,
}: {
  event: ScheduledEvent;
  now: Date;
  lead: LeadInfo | null;
  passed: boolean;
  showMultiRound: boolean;
  totalRounds: number;
}) {
  if (showMultiRound) {
    return (
      <MultiRoundRail
        event={e}
        now={now}
        activeRoundIdx={lead?.roundIdx ?? totalRounds - 1}
        activeNext={lead?.name}
      />
    );
  }
  return (
    <SingleRoundRail
      event={e}
      now={now}
      excludeName={passed ? undefined : lead?.name}
    />
  );
}

function SingleRoundRail({
  event: e,
  now,
  excludeName,
}: {
  event: ScheduledEvent;
  now: Date;
  excludeName?: DateName;
}) {
  const round = e.rounds[0];
  if (!round) return null;
  const entries = (
    Object.entries(round.importantDates) as Array<[DateName, MaybeDate]>
  )
    .filter(([n]) => n !== excludeName)
    .filter(([, d]) => d !== undefined);
  if (entries.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {entries.map(([name, date]) => {
        const past =
          date !== "TBD" && date !== undefined
            ? isDeadlinePast(date, now)
            : false;
        return (
          <span key={name} className={clsx("pill", past && "passed")}>
            {dateNameShort(name)} ·{" "}
            {date === "TBD" ? "TBD" : roundShortDate(date)}
          </span>
        );
      })}
    </div>
  );
}

function MultiRoundRail({
  event: e,
  now,
  activeRoundIdx,
  activeNext,
}: {
  event: ScheduledEvent;
  now: Date;
  activeRoundIdx: number;
  activeNext?: DateName;
}) {
  const earlierIdx = e.rounds.findLastIndex(
    (r, i) => i < activeRoundIdx && r !== undefined
  );
  const prevIdx =
    earlierIdx >= 0
      ? earlierIdx
      : e.rounds.findIndex((_, i) => i !== activeRoundIdx);

  const prev = prevIdx >= 0 ? e.rounds[prevIdx] : null;
  const active = e.rounds[activeRoundIdx] ?? e.rounds[e.rounds.length - 1];

  const prevRows = prev ? buildRoundRows(prev, now) : [];
  const activeRows = active ? buildRoundRows(active, now, activeNext) : [];

  return (
    <div className="mt-2 grid grid-cols-2 gap-3">
      {prev ? (
        <RoundColumn
          idx={prevIdx}
          status="done"
          rows={prevRows}
          active={false}
        />
      ) : (
        <div />
      )}
      <RoundColumn
        idx={activeRoundIdx}
        status="active"
        rows={activeRows}
        active
      />
    </div>
  );
}

function RoundColumn({
  idx,
  status,
  rows,
  active,
}: {
  idx: number;
  status: "done" | "active";
  rows: RailRow[];
  active: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-1 border-l-2 pl-2.5",
        active ? "border-hot" : "border-rule"
      )}
    >
      <div
        className={clsx(
          "flex items-baseline gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em]",
          active ? "text-hot" : "text-ink-3"
        )}
      >
        Round {idx + 1}
        <span
          className="rounded-xs border px-1 py-px text-[9px]"
          style={{ borderColor: "currentColor" }}
        >
          {status}
        </span>
      </div>
      {rows.map((r) => (
        <div
          key={r.name}
          className={clsx(
            "grid grid-cols-[1fr_auto] gap-2 text-[12px]",
            r.kind === "past" && "text-ink-3",
            r.kind === "next" && "font-medium text-ink",
            r.kind === "default" && "text-ink-2"
          )}
        >
          <span
            className={clsx(
              r.kind === "past" && "line-through decoration-rule decoration-1"
            )}
          >
            {dateNameShort(r.name)}
          </span>
          <span
            className={clsx(
              "font-mono text-[11px]",
              r.kind === "next" ? "text-hot" : "text-ink-3",
              r.kind === "past" && "line-through decoration-rule decoration-1"
            )}
          >
            {r.date === "TBD" ? "TBD" : roundShortDate(r.date)}
          </span>
        </div>
      ))}
    </div>
  );
}
