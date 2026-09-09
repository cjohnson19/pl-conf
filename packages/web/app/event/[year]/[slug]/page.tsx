import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { BUILD_NOW_MS, events } from "@pl-conf/data";
import {
  type ScheduledEvent,
  eventKey,
  eventPath,
  eventPathFromSlug,
  eventSlug,
  eventYear2,
  formatDateRange,
  hasConcreteDates,
  roundsWithDates,
} from "../../../lib/event";
import { toDisplayEvent } from "../../../lib/event-list-view";
import {
  type RelatedEvent,
  resolveRelations,
} from "../../../lib/relationships";
import { NowProvider } from "../../../components/event-list/now-provider";
import { BackToList } from "../../../components/event-page/back-to-list";
import { EventActions } from "../../../components/event-page/event-actions";
import { EventDeadlines } from "../../../components/event-page/event-deadlines";
import { EventTags } from "../../../components/event-tags";
import { hoverUnderlineClass } from "../../../components/event-row/shared";
import { LastUpdated } from "../../../components/last-updated";

const allEvents = Object.values(events);
const eventByPath = new Map(allEvents.map((e) => [eventPath(e), e]));

type Params = Promise<{ year: string; slug: string }>;

const typeLabel: Record<ScheduledEvent["type"], string> = {
  conference: "Conference",
  workshop: "Workshop",
  symposium: "Symposium",
};

const sectionHeading =
  "font-mono text-[13px] font-semibold tracking-[0.08em] text-ink-2";

export function generateStaticParams() {
  return allEvents.map((e) => ({
    year: String(e.year),
    slug: eventSlug(e.abbreviation),
  }));
}

function lookup(year: string, slug: string): ScheduledEvent | undefined {
  return eventByPath.get(eventPathFromSlug(year, slug));
}

function dateRange(e: Pick<ScheduledEvent, "date">): string | null {
  return hasConcreteDates(e)
    ? formatDateRange(e.date.start, e.date.end, "long")
    : null;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { year, slug } = await params;
  const e = lookup(year, slug);
  if (!e) return {};
  const yy = eventYear2(e);
  const title = `${e.abbreviation} ’${yy} — ${e.name}`;
  const description = [e.name, e.location, dateRange(e)]
    .filter(Boolean)
    .join(" · ");
  return { title, description };
}

export default async function EventPage({ params }: { params: Params }) {
  const { year, slug } = await params;
  const e = lookup(year, slug);
  if (!e) notFound();

  const yy = eventYear2(e);
  const dates = dateRange(e);
  const relations = resolveRelations(e, allEvents);
  const hasDeadlines =
    e.importantDateUrl !== undefined || roundsWithDates(e.rounds).length > 0;
  const meta = [
    {
      key: "type",
      node: <span className="text-ink-2">{typeLabel[e.type]}</span>,
    },
    e.location
      ? {
          key: "location",
          node: <span className="text-ink-2">{e.location}</span>,
        }
      : undefined,
    dates
      ? { key: "dates", node: <span suppressHydrationWarning>{dates}</span> }
      : undefined,
    e.format
      ? { key: "format", node: <span className="text-ink-2">{e.format}</span> }
      : undefined,
  ].filter((part) => part !== undefined);

  return (
    <article className="mx-auto max-w-[760px] px-5 pb-24 pt-10 md:px-8">
      <BackToList />

      <header className="flex flex-col gap-5 border-b border-rule pb-8">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-display text-[40px] font-bold leading-none tracking-[-0.02em] text-ink">
              {e.abbreviation}
            </h1>
            <span className="font-mono text-[20px] font-medium text-ink-3">
              &rsquo;{yy}
            </span>
          </div>
          {e.url ? (
            <a
              href={e.url}
              target="_blank"
              rel="noopener"
              className="group/url inline-flex w-fit items-baseline gap-1.5 text-[16px] text-ink-2 no-underline"
            >
              <span
                className={`${hoverUnderlineClass} group-hover/url:decoration-ink`}
              >
                {e.name}
              </span>
              <ArrowUpRight
                size={14}
                strokeWidth={1.75}
                className="shrink-0 self-center text-ink-3 transition-all duration-200 ease-out group-hover/url:-translate-y-0.5 group-hover/url:translate-x-0.5 group-hover/url:text-ink"
                aria-hidden
              />
            </a>
          ) : (
            <p className="text-[16px] text-ink-2">{e.name}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] tracking-[0.04em] text-ink-3">
          {meta.map((part, i) => (
            <Fragment key={part.key}>
              {i > 0 && (
                <span aria-hidden className="text-ink-3/60">
                  ·
                </span>
              )}
              {part.node}
            </Fragment>
          ))}
        </div>

        <EventTags tags={e.tags} />

        <EventActions event={toDisplayEvent(e)} prefKey={eventKey(e)} />
      </header>

      {hasDeadlines && (
        <section className="border-b border-rule py-8">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className={sectionHeading}>Dates &amp; Deadlines</h2>
            {e.importantDateUrl && (
              <a
                href={e.importantDateUrl}
                target="_blank"
                rel="noopener"
                className="group/src inline-flex shrink-0 items-center gap-1 text-[12px] text-ink-3 no-underline transition-colors hover:text-ink"
              >
                <span
                  className={`${hoverUnderlineClass} group-hover/src:decoration-ink`}
                >
                  Official page
                </span>
                <ArrowUpRight
                  size={12}
                  strokeWidth={1.75}
                  className="transition-transform duration-200 ease-out group-hover/src:-translate-y-0.5 group-hover/src:translate-x-0.5"
                  aria-hidden
                />
              </a>
            )}
          </div>
          <NowProvider initialMs={BUILD_NOW_MS}>
            <EventDeadlines rounds={e.rounds} />
          </NowProvider>
        </section>
      )}

      {e.notes.length > 0 && (
        <section className="border-b border-rule py-8">
          <h2 className={`${sectionHeading} mb-4`}>Notes</h2>
          <ul className="flex flex-col gap-2 text-[14px] leading-[1.6] text-ink-2">
            {e.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}

      <RelationGroup
        title="Part of"
        relations={relations.partOf}
        parentLocation={e.location}
      />
      <RelationGroup
        title="Includes"
        relations={relations.contains}
        parentLocation={e.location}
      />
      <RelationGroup
        title="Co-located with"
        relations={relations.colocatedWith}
        parentLocation={e.location}
      />

      <p className="mt-8 font-mono text-[11px] tracking-[0.04em] text-ink-3">
        Last updated <LastUpdated date={e.lastUpdated} />
      </p>
    </article>
  );
}

function relationDates(r: RelatedEvent): string | null {
  return hasConcreteDates(r)
    ? formatDateRange(r.date.start, r.date.end, "short")
    : null;
}

function showsLocation(r: RelatedEvent, parentLocation?: string): boolean {
  return r.location !== undefined && r.location !== parentLocation;
}

function RelationGroup({
  title,
  relations,
  parentLocation,
}: {
  title: string;
  relations: RelatedEvent[];
  parentLocation?: string;
}) {
  if (relations.length === 0) return null;
  return (
    <section className="border-b border-rule py-8">
      <h2 className={`${sectionHeading} mb-2`}>{title}</h2>
      <ul className="flex flex-col divide-y divide-rule/50">
        {relations.map((r) => (
          <li key={r.path}>
            <RelationRow r={r} parentLocation={parentLocation} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RelationRow({
  r,
  parentLocation,
}: {
  r: RelatedEvent;
  parentLocation?: string;
}) {
  const dates = relationDates(r);
  const location = showsLocation(r, parentLocation) ? r.location : undefined;
  return (
    <Link
      href={r.path}
      className="group/rel flex items-baseline gap-x-4 gap-y-1 py-3 no-underline"
    >
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <span className="font-ui text-[15px] font-bold tracking-[-0.015em] text-ink transition-colors group-hover/rel:text-accent">
          {r.abbreviation}
        </span>
        <span className="text-[14px] leading-[1.5] text-ink-2">{r.name}</span>
      </span>
      {(dates || location) && (
        <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
          {dates && (
            <span
              className="font-mono text-[12px] text-ink-3"
              suppressHydrationWarning
            >
              {dates}
            </span>
          )}
          {location && (
            <span className="font-mono text-[11px] tracking-[0.04em] text-ink-3">
              {location}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
