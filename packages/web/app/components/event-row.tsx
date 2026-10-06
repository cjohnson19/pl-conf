import clsx from "clsx";
import Link from "next/link";
import {
  calendarDate,
  eventKey,
  eventPath,
  eventYear2,
  hasOpenSubmissionAt,
} from "../lib/event";
import type { DisplayEvent } from "../lib/event-list-view";
import { isMidMultiRound, nextDeadline } from "../lib/deadline";
import { FavoriteButton } from "./favorite-button";
import { CalendarMenu } from "./calendar-menu";
import { ConnectedEventTags } from "./event-tags";
import { RowActionSheet } from "./row-action-sheet";
import {
  DatesDeadlinesLink,
  EventNameLink,
  RelatedLinks,
} from "./event-row/shared";
import { RoundRail } from "./event-row/rail";
import { LocalDate, LocalDateRange } from "./local-date";

// `now` freezes per render — the round badge and has-open-submission do not
// tick. Group headers handle the live clock.
export function EventRow({
  event: e,
  showDate,
  now,
}: {
  event: DisplayEvent;
  // The event's start date on the left; off when the group heading already
  // names the deadline the row is listed under.
  showDate: boolean;
  now: Date;
}) {
  const next = nextDeadline(e, now);
  const totalRounds = e.rounds.length;

  const year2 = eventYear2(e);
  const openSubmission = hasOpenSubmissionAt(now)(e);
  const start = e.date.start === "TBD" ? undefined : calendarDate(e.date.start);

  return (
    <div
      data-event-key={eventKey(e)}
      data-event-abbrev={e.abbreviation}
      data-has-open-submission={openSubmission ? "" : undefined}
      className={clsx(
        "group grid items-center rounded-xs border-t border-rule",
        showDate ? "event-row-grid" : "event-row-grid--no-date",
        "py-[22px] px-5 md:px-8 transition-colors",
        "hover:bg-[color-mix(in_srgb,var(--card)_70%,transparent)]",
        ""
      )}
    >
      {showDate && (
        <div
          className="flex flex-col items-start gap-1.5 self-start @[680px]/row:self-auto"
          style={{ gridArea: "date" }}
        >
          <div className="font-ui text-[22px] font-semibold leading-none tracking-[-0.025em] text-ink tabular-nums @[420px]/row:text-[24px] @[680px]/row:text-[32px]">
            {start?.getDate() ?? "—"}
          </div>
          <div className="font-mono text-[11px] font-medium leading-none tracking-[0.08em] text-ink-2">
            <LocalDate date={e.date.start} style="monthShort" />
          </div>
          <div className="font-mono text-[10px] font-medium leading-none tracking-[0.06em] text-ink-3">
            {start?.getFullYear()}
          </div>
        </div>
      )}

      <div
        className="flex min-w-0 flex-col gap-1.5"
        style={{ gridArea: "title" }}
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-ui text-[22px] font-bold leading-none tracking-[-0.015em]">
          <Link
            href={eventPath(e)}
            className="text-ink no-underline decoration-1 underline-offset-[3px] transition-colors hover:text-accent hover:underline hover:decoration-accent"
          >
            {e.abbreviation}
          </Link>
          <span className="font-mono text-[14px] font-medium text-ink-3">
            &rsquo;{year2}
          </span>
          {next && isMidMultiRound(e, now) && (
            <span
              className="inline-flex h-[18px] items-center rounded-xs border px-1.5 font-mono text-[10px] font-medium tracking-[0.06em] text-hot"
              style={{ borderColor: "currentColor" }}
            >
              Round {next.roundIdx + 1} / {totalRounds}
            </span>
          )}
          <ConnectedEventTags tags={e.tags} />
        </div>
        <EventNameLink event={e} />
        <RowMetadata event={e} />
      </div>

      <div
        className="flex min-w-0 flex-col gap-1 text-[13px]"
        style={{ gridArea: "rail" }}
      >
        {e.importantDateUrl && <DatesDeadlinesLink href={e.importantDateUrl} />}
        <RoundRail event={e} now={now} />
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
        <span>
          <LocalDateRange start={e.date.start} end={e.date.end} style="short" />
        </span>
      ),
      wideOnly: false,
    });
  if (e.partOfLinks.length > 0)
    items.push({
      node: (
        <span>
          part of <RelatedLinks links={e.partOfLinks} />
        </span>
      ),
      wideOnly: true,
    });
  if (e.colocatedLinks.length > 0)
    items.push({
      node: (
        <span>
          co-located <RelatedLinks links={e.colocatedLinks} />
        </span>
      ),
      wideOnly: true,
    });
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 whitespace-nowrap font-mono text-[11px] tracking-[0.04em] text-ink-3">
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
                item.wideOnly && "hidden xl:inline"
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
            className={clsx(item.wideOnly && "hidden xl:inline")}
          >
            {item.node}
          </span>
        );
        return nodes;
      })}
    </div>
  );
}
