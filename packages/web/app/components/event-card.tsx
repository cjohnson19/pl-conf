"use client";

import { memo } from "react";
import { ArrowUpRight } from "lucide-react";
import { eventKey, formatDate, formatDateRange } from "../lib/event";
import type { DisplayEvent } from "../lib/event-list-view";
import { FavoriteButton } from "./favorite-button";
import { CalendarMenu } from "./calendar-menu";
import { ConnectedEventTags } from "./event-tags";
import { DatesDeadlinesLink, useEventLead } from "./event-row/shared";
import { CardDeadlineTable } from "./event-row/card-deadlines";

function EventCardImpl({ event: e, now }: { event: DisplayEvent; now: Date }) {
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
      data-event-key={eventKey(e)}
      className="event-card flex h-full flex-col gap-2 border border-rule p-4"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
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
          {e.tags.length > 0 && <ConnectedEventTags tags={e.tags} />}
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

export const EventCard = memo(EventCardImpl);
