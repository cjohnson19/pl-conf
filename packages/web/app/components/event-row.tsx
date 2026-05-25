import clsx from "clsx";
import {
  type MaybeDate,
  allDeadlines,
  eventKey,
  formatDate,
  formatDateRange,
  isDeadlinePast,
  isDeadlineUrgent,
} from "../lib/event";
import type { DisplayEvent } from "../lib/event-list-view";
import { findNextDeadline } from "../lib/deadline";
import { dayNum, monthShort, yearNum } from "../lib/date-formatters";
import { FavoriteButton } from "./favorite-button";
import { CalendarMenu } from "./calendar-menu";
import { ConnectedEventTags } from "./event-tags";
import { RowActionSheet } from "./row-action-sheet";
import { DatesDeadlinesLink, EventNameLink } from "./event-row/shared";
import { RoundRail } from "./event-row/rail";

export function EventRow({
  event: e,
  now,
  hideDate = false,
}: {
  event: DisplayEvent;
  now: Date;
  hideDate?: boolean;
}) {
  const lead = findNextDeadline(e, now, { fallbackToPast: true });

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
        <div
          className="flex flex-col items-start gap-1.5 self-start @[680px]/row:self-auto"
          style={{ gridArea: "date" }}
        >
          <div
            className={clsx(
              "font-ui font-semibold leading-none tracking-[-0.025em] tabular-nums",
              "text-[22px] @[420px]/row:text-[24px] @[680px]/row:text-[32px]",
              urgent ? "text-hot" : "text-ink"
            )}
          >
            {dayNum(anchorDate)}
          </div>
          <div
            className="font-mono text-[11px] font-medium uppercase leading-none tracking-[0.08em] text-ink-2"
            suppressHydrationWarning
          >
            {monthShort(anchorDate)}
          </div>
          <div className="font-mono text-[10px] font-medium leading-none tracking-[0.06em] text-ink-3">
            {yearNum(anchorDate)}
          </div>
        </div>
      )}

      <div
        className="flex min-w-0 flex-col gap-1.5"
        style={{ gridArea: "title" }}
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-ui text-[22px] font-bold leading-none tracking-[-0.015em]">
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
          {e.tags.length > 0 && <ConnectedEventTags tags={e.tags} />}
        </div>
        <EventNameLink event={e} />
        <RowMetadata event={e} />
      </div>

      <div
        className="flex min-w-0 flex-col gap-1 text-[13px]"
        style={{ gridArea: "rail" }}
      >
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

      <div
        className="flex items-center justify-end gap-1 self-start @[680px]/row:self-auto"
        style={{ gridArea: "actions" }}
      >
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

function RowMetadata({ event: e }: { event: DisplayEvent }) {
  const items: { node: React.ReactNode; wideOnly: boolean }[] = [];
  if (e.location)
    items.push({
      node: <span className="text-ink-2">{e.location}</span>,
      wideOnly: false,
    });
  if (e.date.start !== "TBD" && e.date.end !== "TBD")
    items.push({
      node: (
        <span suppressHydrationWarning>
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
