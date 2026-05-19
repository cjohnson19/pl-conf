"use client";

import { memo } from "react";
import clsx from "clsx";
import { ArrowUpRight } from "lucide-react";
import {
  type MaybeDate,
  type ScheduledEvent,
  allDeadlines,
  eventKey,
  formatDate,
  formatDateRange,
  isDeadlinePast,
  isDeadlineUrgent,
} from "../lib/event";
import { dayNum, monthShort, yearNum } from "../lib/date-formatters";
import { FavoriteButton } from "./favorite-button";
import { CalendarMenu } from "./calendar-menu";
import { RowActionSheet } from "./row-action-sheet";
import {
  DatesDeadlinesLink,
  EventNameLink,
  useEventLead,
} from "./event-row/shared";
import { RoundRail } from "./event-row/rail";
import { CardDeadlineTable } from "./event-row/card-deadlines";

function EventRowImpl({
  event: e,
  now,
  hideDate = false,
}: {
  event: ScheduledEvent;
  now: Date;
  hideDate?: boolean;
}) {
  const lead = useEventLead(e, now);

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
        "py-[22px] px-5 md:px-8 transition-colors",
        "hover:bg-[color-mix(in_srgb,var(--card)_70%,transparent)]"
      )}
    >
      {!hideDate && (
        <div className="flex flex-col items-start gap-1.5 self-start @[680px]/row:self-auto">
          <div
            className={clsx(
              "font-ui font-semibold leading-none tracking-[-0.025em] tabular-nums",
              "text-[22px] @[420px]/row:text-[24px] @[680px]/row:text-[32px]",
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
        <EventNameLink event={e} />
        <RowMetadata event={e} />
        {e.importantDateUrl && (
          <div className="@[680px]/row:hidden">
            <DatesDeadlinesLink href={e.importantDateUrl} />
          </div>
        )}
        <div className="block pt-1 @[680px]/row:hidden">
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

      <div className="hidden min-w-0 flex-col gap-1 text-[13px] @[680px]/row:flex">
        {e.importantDateUrl && <DatesDeadlinesLink href={e.importantDateUrl} />}

        <RoundRail
          event={e}
          now={now}
          lead={lead}
          passed={passed}
          showMultiRound={showMultiRound}
          totalRounds={totalRounds}
        />
      </div>

      <div className="flex items-center justify-end gap-1 self-start @[680px]/row:self-auto">
        <div className="hidden @[680px]/row:contents">
          <FavoriteButton prefKey={eventKey(e)} />
          <CalendarMenu event={e} />
        </div>
        <div className="contents @[680px]/row:hidden">
          <RowActionSheet event={e} prefKey={eventKey(e)} />
        </div>
      </div>
    </div>
  );
}

function RowMetadata({ event: e }: { event: ScheduledEvent }) {
  const items: { node: React.ReactNode; wideOnly: boolean }[] = [];
  if (e.location)
    items.push({
      node: <span className="text-ink-2">{e.location}</span>,
      wideOnly: false,
    });
  if (e.date.start !== "TBD" && e.date.end !== "TBD")
    items.push({
      node: <span>{formatDateRange(e.date.start, e.date.end, "short")}</span>,
      wideOnly: false,
    });
  if (e.partOf.length > 0)
    items.push({
      node: (
        <span>
          part of{" "}
          <b className="font-medium text-ink-2">{e.partOf.join(", ")}</b>
        </span>
      ),
      wideOnly: true,
    });
  if (e.colocatedWith.length > 0)
    items.push({
      node: (
        <span>
          co-located{" "}
          <b className="font-medium text-ink-2">{e.colocatedWith.join(", ")}</b>
        </span>
      ),
      wideOnly: true,
    });
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.04em] text-ink-3">
      {items.flatMap((item, i) => {
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
            className={clsx(item.wideOnly && "hidden min-[1280px]:inline")}
          >
            {item.node}
          </span>
        );
        return nodes;
      })}
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
  const lead = useEventLead(e, now);
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
            <DatesDeadlinesLink href={e.importantDateUrl} />
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

export const EventRow = memo(EventRowImpl);
export const EventCard = memo(EventCardImpl);
