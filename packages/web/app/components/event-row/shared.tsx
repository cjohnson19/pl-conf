import { Fragment } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  type DateName,
  type MaybeDate,
  type Round,
  isDeadlinePast,
  isDeadlineUrgent,
} from "../../lib/event";
import type { DisplayEvent, RelatedLink } from "../../lib/event-list-view";

export type ChipKind = "past" | "next" | "default";

export type RailRow = {
  name: DateName;
  date: MaybeDate;
  kind: ChipKind;
  urgent?: boolean;
};

export function buildRoundRows(
  round: Round,
  now: Date,
  highlightNext = true
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
  const nextName = highlightNext
    ? entries.find(([, d]) => d !== "TBD" && !isDeadlinePast(d, now))?.[0]
    : undefined;
  return entries.map(([name, date]) => {
    if (date === "TBD") return { name, date, kind: "default" as ChipKind };
    if (isDeadlinePast(date, now))
      return { name, date, kind: "past" as ChipKind };
    if (name === nextName)
      return {
        name,
        date,
        kind: "next" as ChipKind,
        urgent: isDeadlineUrgent(date, now),
      };
    return { name, date, kind: "default" as ChipKind };
  });
}

export function EventNameLink({
  event: e,
  className,
  iconSize = 11,
}: {
  event: DisplayEvent;
  className?: string;
  iconSize?: number;
}) {
  if (!e.url) {
    return (
      <div
        className={
          className ??
          "overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-ink-2"
        }
      >
        {e.name}
      </div>
    );
  }
  return (
    <a
      href={e.url}
      target="_blank"
      aria-label={`Open ${e.abbreviation} website`}
      className={
        className ??
        "group/url flex w-fit min-w-0 max-w-full items-baseline gap-1.5 text-[13px] text-ink-2 no-underline"
      }
      rel="noopener"
    >
      <span className="min-w-0 truncate underline decoration-rule decoration-1 underline-offset-[3px] transition-[text-decoration-color] duration-200 ease-out group-hover/url:decoration-ink">
        {e.name}
      </span>
      <ArrowUpRight
        size={iconSize}
        strokeWidth={1.75}
        className="shrink-0 self-center text-ink-3 transition-all duration-200 ease-out group-hover/url:translate-x-0.5 group-hover/url:-translate-y-0.5 group-hover/url:text-ink"
        aria-hidden
      />
    </a>
  );
}

export function RelatedLinks({ links }: { links: RelatedLink[] }) {
  return (
    <>
      {links.map((l, i) => (
        <Fragment key={l.abbreviation}>
          {i > 0 ? ", " : null}
          {l.path ? (
            <Link
              href={l.path}
              className="font-medium text-ink-2 underline decoration-rule decoration-1 underline-offset-2 transition-[text-decoration-color,color] duration-200 ease-out hover:text-ink hover:decoration-ink"
            >
              {l.abbreviation}
            </Link>
          ) : (
            <b className="font-medium text-ink-2">{l.abbreviation}</b>
          )}
        </Fragment>
      ))}
    </>
  );
}

export function DatesDeadlinesLink({ href }: { href: string }) {
  return (
    <a
      href={href}
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
  );
}
