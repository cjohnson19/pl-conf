"use client";

import { memo, useMemo } from "react";
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
      return "Conditional Acceptance";
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

function roundShortDate(date: MaybeDate): string {
  if (date === "TBD") return "TBD";
  const cal = toCalendarDate(date);
  return cal ? monthDayFmt.format(cal) : "TBD";
}

type ChipKind = "past" | "next" | "default";

type RailRow = {
  name: DateName;
  date: MaybeDate;
  kind: ChipKind;
  urgent?: boolean;
};

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
      return {
        name,
        date,
        kind: "next" as ChipKind,
        urgent: isDeadlineUrgent(date, now),
      };
    return { name, date, kind: "default" as ChipKind };
  });
}

function EventRowImpl({
  event: e,
  now,
  hideDate = false,
}: {
  event: ScheduledEvent;
  now: Date;
  hideDate?: boolean;
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
        hideDate ? "event-row-grid--no-date" : "event-row-grid",
        "py-[22px] px-4 -mx-4 transition-colors",
        "hover:bg-[color-mix(in_srgb,var(--card)_70%,transparent)]"
      )}
    >
      {!hideDate && (
        <div className="flex flex-col items-start gap-1.5 self-start @[760px]/row:self-auto">
          <div
            className={clsx(
              "font-ui font-semibold leading-none tracking-[-0.025em] tabular-nums",
              "text-[22px] @[420px]/row:text-[24px] @[760px]/row:text-[32px]",
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
      )}

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
            aria-label={`Open ${e.abbreviation} website`}
            className="group/url flex w-fit min-w-0 max-w-full items-baseline gap-1.5 text-[13px] text-ink-2 no-underline"
            rel="noopener"
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
                    // biome-ignore lint/suspicious/noArrayIndexKey: items list is built fresh each render with no preserved state
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
                  // biome-ignore lint/suspicious/noArrayIndexKey: items list is built fresh each render with no preserved state
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
              compact={hideDate}
            />
          ))}
        <div className="block pt-1 @[760px]/row:hidden">
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

      <div className="hidden min-w-0 flex-col gap-1 text-[13px] @[760px]/row:flex">
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
            compact={hideDate}
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

      <div className="flex items-center justify-end gap-1 self-start @[760px]/row:self-auto">
        <div className="hidden @[760px]/row:contents">
          <FavoriteButton prefKey={eventKey(e)} />
          <CalendarMenu event={e} />
        </div>
        <div className="contents @[760px]/row:hidden">
          <RowActionSheet event={e} prefKey={eventKey(e)} />
        </div>
      </div>
    </div>
  );
}

function EventCardImpl({
  event: e,
  now,
}: {
  event: ScheduledEvent;
  now: Date;
}) {
  const lead = useMemo(() => findLead(e, now), [e, now]);
  const year2 = formatDate(e.date.start, "year2", "en-US");
  const startStr =
    e.date.start !== "TBD" && e.date.end !== "TBD"
      ? formatDateRange(e.date.start, e.date.end, "short")
      : null;

  const deadlineRounds = e.rounds.filter(
    (r) => Object.keys(r.importantDates).length > 0
  );
  const hasRelationships = e.partOf.length > 0 || e.colocatedWith.length > 0;
  const titleInner = (
    <span className="font-ui text-[19px] font-bold leading-tight tracking-[-0.015em]">
      {e.abbreviation} &rsquo;{year2}
    </span>
  );

  return (
    <div
      className="flex h-full flex-col gap-2 border border-rule p-4"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {e.url ? (
            <a
              href={e.url}
              target="_blank"
              aria-label={`Open ${e.abbreviation} website`}
              className="group/title inline-flex min-w-0 items-center gap-0.5 no-underline"
              rel="noopener"
            >
              {titleInner}
              <ArrowUpRight
                size={14}
                strokeWidth={1.75}
                className="shrink-0 text-ink-3 transition-all duration-200 ease-out group-hover/title:-translate-y-0.5 group-hover/title:translate-x-0.5 group-hover/title:text-ink"
                aria-hidden
              />
            </a>
          ) : (
            titleInner
          )}
        </div>
        <div className="-my-2 -mr-1 flex shrink-0 items-center gap-0.5 [&_button]:h-8 [&_button]:w-8">
          <FavoriteButton prefKey={eventKey(e)} />
          <CalendarMenu event={e} />
        </div>
      </div>

      <div className="line-clamp-2 text-[13px] leading-[1.4] text-ink-2">
        {e.name}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12px] text-ink-3">
        {startStr && <span>{startStr}</span>}
        {startStr && e.location && (
          <span aria-hidden className="text-ink-3/60">
            ·
          </span>
        )}
        {e.location && (
          <span className="min-w-0 truncate text-ink-2">{e.location}</span>
        )}
      </div>

      {(deadlineRounds.length > 0 || e.importantDateUrl) && (
        <div className="mt-1 flex flex-col gap-2">
          {e.importantDateUrl && (
            <a
              href={e.importantDateUrl}
              target="_blank"
              aria-label="View important dates"
              className="group/dates inline-flex items-center gap-1 self-start text-[12px] font-medium text-ink no-underline"
              rel="noopener"
            >
              <span className="underline decoration-rule decoration-1 underline-offset-[3px] transition-[text-decoration-color] duration-200 ease-out group-hover/dates:decoration-ink">
                Dates &amp; Deadlines
              </span>
              <ArrowUpRight
                size={12}
                strokeWidth={1.75}
                className="text-ink-3 transition-all duration-200 ease-out group-hover/dates:-translate-y-0.5 group-hover/dates:translate-x-0.5 group-hover/dates:text-ink"
                aria-hidden
              />
            </a>
          )}
          {deadlineRounds.map((r, idx) => (
            <CardDeadlineTable
              key={r.name ?? idx}
              round={r}
              roundIndex={idx}
              showRoundLabel={deadlineRounds.length > 1}
              activeName={lead?.roundIdx === idx ? lead?.name : undefined}
              now={now}
            />
          ))}
        </div>
      )}

      {hasRelationships && (
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-rule pt-3 text-[11px] text-ink-3">
          {e.partOf.length > 0 && (
            <span>
              Part of{" "}
              <b className="font-medium text-ink-2">{e.partOf.join(", ")}</b>
            </span>
          )}
          {e.partOf.length > 0 && e.colocatedWith.length > 0 && (
            <span aria-hidden className="text-ink-3/60">
              ·
            </span>
          )}
          {e.colocatedWith.length > 0 && (
            <span>
              Co-located with{" "}
              <b className="font-medium text-ink-2">
                {e.colocatedWith.join(", ")}
              </b>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function CardDeadlineTable({
  round,
  roundIndex,
  showRoundLabel,
  activeName,
  now,
}: {
  round: Round;
  roundIndex: number;
  showRoundLabel: boolean;
  activeName: DateName | undefined;
  now: Date;
}) {
  const rows = buildRoundRows(round, now, activeName);
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      {showRoundLabel && (
        <div className="text-[10px] font-medium tracking-[0.06em] text-ink-3">
          {round.name ?? `Round ${roundIndex + 1}`}
        </div>
      )}
      <table className="w-full border-collapse text-[12px]">
        <tbody>
          {rows.map((r) => (
            <CardDeadlineRow key={r.name} row={r} now={now} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardDeadlineRow({ row: r, now }: { row: RailRow; now: Date }) {
  const next = r.kind === "next";
  return (
    <tr>
      <td
        className={clsx(
          "py-1 pr-2 align-baseline",
          next && "font-medium text-ink"
        )}
      >
        {dateNameShort(r.name)}
      </td>
      <td
        className={clsx(
          "py-1 pr-2 align-baseline whitespace-nowrap font-mono",
          next ? "text-ink" : "text-ink-3"
        )}
      >
        {r.date === "TBD" ? "TBD" : roundShortDate(r.date)}
      </td>
      <td
        className={clsx(
          "py-1 text-right align-baseline whitespace-nowrap font-mono text-[11px]",
          next
            ? r.urgent
              ? "text-hot"
              : "text-[color:var(--accent)]"
            : "text-ink-3"
        )}
      >
        {r.date === "TBD" ? "" : shortCountdown(r.date, now)}
      </td>
    </tr>
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
          ? "flex gap-2 text-[12px] @[760px]/row:hidden"
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
  compact = false,
}: {
  size: "mobile" | "desktop";
  event: ScheduledEvent;
  lead: LeadInfo;
  now: Date;
  urgent: boolean;
  showMultiRound: boolean;
  compact?: boolean;
}) {
  const leadKindLabel = showMultiRound
    ? `R${lead.roundIdx + 1} ${dateNameShort(lead.name).toLowerCase()}`
    : dateNameShort(lead.name);
  const isMobile = size === "mobile";
  const inner = (
    <>
      {!compact && (
        <span
          className={clsx(
            "font-ui font-semibold leading-none tracking-[-0.01em] tabular-nums",
            isMobile ? "text-[13px]" : "text-[15px]",
            urgent ? "text-hot" : "text-[color:var(--accent)]"
          )}
        >
          {shortCountdown(lead.date, now)}
        </span>
      )}
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
        {isDeadline(lead.name) ? " deadline" : ""}
        {!compact && (
          <>
            {" "}
            <span
              className={clsx(
                "font-mono tracking-[0.04em] text-ink-3",
                isMobile ? "text-[10px]" : "text-[11px]"
              )}
            >
              {roundShortDate(lead.date)} 23:59 AoE
            </span>
          </>
        )}
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
    "flex w-fit max-w-full items-baseline gap-2 py-2 -my-2 text-[12px] @[760px]/row:hidden";
  const desktopWrapper =
    "flex w-fit max-w-full items-baseline gap-2.5 font-medium text-ink";

  if (e.importantDateUrl) {
    return (
      <a
        href={e.importantDateUrl}
        target="_blank"
        aria-label="View important dates"
        className={clsx(
          "no-underline",
          isMobile ? mobileWrapper : `group/lead ${desktopWrapper}`
        )}
        rel="noopener"
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
      activeNext={passed ? undefined : lead?.name}
    />
  );
}

function SingleRoundRail({
  event: e,
  now,
  activeNext,
}: {
  event: ScheduledEvent;
  now: Date;
  activeNext?: DateName;
}) {
  const round = e.rounds[0];
  if (!round) return null;
  const rows = buildRoundRows(round, now, activeNext);
  if (rows.length === 0) return null;
  return (
    <div className="mt-2 flex max-w-xs flex-col gap-1 border-l-2 border-rule pl-2.5">
      {rows.map((r) => (
        <DateRow key={r.name} row={r} />
      ))}
    </div>
  );
}

function DateRow({ row: r }: { row: RailRow }) {
  return (
    <div
      className={clsx(
        "grid grid-cols-[1fr_auto] gap-2 text-[12px]",
        r.kind === "next" ? "font-medium text-ink" : "text-ink-2"
      )}
    >
      <span>{dateNameShort(r.name)}</span>
      <span
        className={clsx(
          "font-mono text-[11px]",
          r.kind === "next"
            ? r.urgent
              ? "text-hot"
              : "text-[color:var(--accent)]"
            : "text-ink-3"
        )}
      >
        {r.date === "TBD" ? "TBD" : roundShortDate(r.date)}
      </span>
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
  const urgent = active && rows.some((r) => r.kind === "next" && r.urgent);
  const accentClass = urgent ? "text-hot" : "text-[color:var(--accent)]";
  const borderClass = urgent ? "border-hot" : "border-[color:var(--accent)]";
  return (
    <div
      className={clsx(
        "flex flex-col gap-1 border-l-2 pl-2.5",
        active ? borderClass : "border-rule"
      )}
    >
      <div
        className={clsx(
          "flex items-baseline gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em]",
          active ? accentClass : "text-ink-3"
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
        <DateRow key={r.name} row={r} />
      ))}
    </div>
  );
}

export const EventRow = memo(EventRowImpl);
export const EventCard = memo(EventCardImpl);
