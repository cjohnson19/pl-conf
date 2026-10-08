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
  rowControlClass,
} from "./event-row/shared";
import { RoundRail } from "./event-row/rail";
import { LocalDate, LocalDateRange } from "./local-date";

// Stretched link: the abbreviation's ::after covers the whole row (which is
// `relative isolate`), so a click anywhere opens the event page. Other controls
// sit above it via `rowControlClass`, and the row's hover tint is the only
// hover cue — the link itself carries none so it reads as one target.
// https://getbootstrap.com/docs/5.3/helpers/stretched-link/
const rowCoverClass = "after:absolute after:inset-0 after:content-['']";

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
        "group relative isolate grid items-center rounded-xs border-t border-border",
        showDate ? "event-row-grid" : "event-row-grid--no-date",
        "py-[22px] px-5 md:px-8 transition-colors",
        "hover:bg-[color-mix(in_srgb,var(--fg)_8%,transparent)]"
      )}
    >
      {showDate && (
        <div
          className="flex flex-col items-start gap-1.5 self-start @[680px]/row:self-auto"
          style={{ gridArea: "date" }}
        >
          <div className="text-[22px] font-semibold leading-none tracking-[-0.025em] text-fg tabular-nums @[420px]/row:text-[24px] @[680px]/row:text-[32px]">
            {start?.getDate() ?? "—"}
          </div>
          <LocalDate
            date={e.date.start}
            style="monthShort"
            className="text-[11px] font-medium leading-none tracking-[0.08em] text-fg-2"
          />
          <div className="text-[10px] font-medium leading-none tracking-[0.06em] text-fg-3">
            {start?.getFullYear()}
          </div>
        </div>
      )}

      <div
        className="flex min-w-0 flex-col gap-1.5"
        style={{ gridArea: "title" }}
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[22px] font-bold leading-none tracking-[-0.015em]">
          <Link
            href={eventPath(e)}
            aria-label={`${e.abbreviation} ${e.year}`}
            className={clsx("text-fg no-underline", rowCoverClass)}
          >
            {e.abbreviation}
          </Link>
          <span className="text-[14px] font-medium text-fg-3">
            &rsquo;{year2}
          </span>
          {next && isMidMultiRound(e, now) && (
            <span
              className="inline-flex h-[18px] items-center rounded-xs border px-1.5 text-[10px] font-medium tracking-[0.06em] text-urgent"
              style={{ borderColor: "currentColor" }}
            >
              Round {next.roundIdx + 1} / {totalRounds}
            </span>
          )}
          <ConnectedEventTags tags={e.tags} className={rowControlClass} />
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
        className={clsx(
          "flex items-center justify-end gap-1 self-start @[680px]/row:self-auto",
          rowControlClass
        )}
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
      node: <span className="text-fg-2">{e.location}</span>,
      wideOnly: false,
    });
  if (e.date.start !== "TBD" && e.date.end !== "TBD")
    items.push({
      node: (
        <LocalDateRange start={e.date.start} end={e.date.end} style="short" />
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 whitespace-nowrap text-[11px] tracking-[0.04em] text-fg-3">
      {items.flatMap((item, i) => {
        const nodes: React.ReactNode[] = [];
        if (i > 0) {
          nodes.push(
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: items list is built fresh each render with no preserved state
              key={`sep-${i}`}
              aria-hidden
              className={item.wideOnly ? "hidden xl:inline" : undefined}
            >
              ·
            </span>
          );
        }
        nodes.push(
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: items list is built fresh each render with no preserved state
            key={`item-${i}`}
            className={item.wideOnly ? "hidden xl:inline" : undefined}
          >
            {item.node}
          </span>
        );
        return nodes;
      })}
    </div>
  );
}
