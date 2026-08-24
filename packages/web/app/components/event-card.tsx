"use client";

import { memo } from "react";
import Link from "next/link";
import {
  eventKey,
  eventPath,
  eventYear2,
  formatDateRange,
  hasOpenSubmissionAt,
  roundsWithDates,
} from "../lib/event";
import type { DisplayEvent } from "../lib/event-list-view";
import { FavoriteButton } from "./favorite-button";
import { CalendarMenu } from "./calendar-menu";
import { ConnectedEventTags } from "./event-tags";
import { useNow } from "./event-list/now-provider";
import {
  DatesDeadlinesLink,
  EventNameLink,
  RelatedLinks,
} from "./event-row/shared";
import { CardDeadlineTable } from "./event-row/card-deadlines";

function EventCardImpl({ event: e }: { event: DisplayEvent }) {
  const now = useNow();
  const year2 = eventYear2(e);
  const startStr =
    e.date.start !== "TBD" && e.date.end !== "TBD"
      ? formatDateRange(e.date.start, e.date.end, "short")
      : null;

  const deadlineRounds = roundsWithDates(e.rounds);
  const hasRelationships =
    e.partOfLinks.length > 0 || e.colocatedLinks.length > 0;
  const openSubmission = hasOpenSubmissionAt(now)(e);

  return (
    <div
      data-event-key={eventKey(e)}
      data-has-open-submission={openSubmission ? "" : undefined}
      className="event-card flex h-full flex-col gap-2 border border-rule p-4"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={eventPath(e)}
            className="font-ui text-[19px] font-bold leading-tight tracking-[-0.015em] text-ink no-underline transition-colors hover:text-accent"
          >
            {e.abbreviation} &rsquo;{year2}
          </Link>
          <ConnectedEventTags tags={e.tags} />
        </div>
        <div className="-my-2 -mr-1 flex shrink-0 items-center gap-0.5 [&_button]:h-8 [&_button]:w-8">
          <FavoriteButton prefKey={eventKey(e)} />
          <CalendarMenu event={e} />
        </div>
      </div>

      <EventNameLink event={e} />

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12px] text-ink-3">
        {startStr && <span suppressHydrationWarning>{startStr}</span>}
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
              now={now}
            />
          ))}
        </div>
      )}

      {hasRelationships && (
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-rule pt-3 text-[11px] text-ink-3">
          {e.partOfLinks.length > 0 && (
            <span>
              Part of <RelatedLinks links={e.partOfLinks} />
            </span>
          )}
          {e.partOfLinks.length > 0 && e.colocatedLinks.length > 0 && (
            <span aria-hidden className="text-ink-3/60">
              ·
            </span>
          )}
          {e.colocatedLinks.length > 0 && (
            <span>
              Co-located with <RelatedLinks links={e.colocatedLinks} />
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export const EventCard = memo(EventCardImpl);
