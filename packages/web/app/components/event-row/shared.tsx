import { Fragment } from "react";
import Link from "next/link";
import {
  type DateName,
  type MaybeDate,
  type Round,
  isDeadlinePast,
  roundEntries,
} from "../../lib/event";
import type { DisplayEvent, RelatedLink } from "../../lib/event-list-view";
import { ArrowUpRight } from "lucide-react";

type ChipKind = "past" | "next" | "default";

export type RailRow = {
  name: DateName;
  date: MaybeDate;
  kind: ChipKind;
};

// Base classes for the animated hover underline; compose with the caller's
// group-hover/<name>:decoration-fg variant.
export const hoverUnderlineClass =
  "underline decoration-border decoration-1 underline-offset-[3px] transition-[text-decoration-color] duration-200 ease-out";

// Lifts a row's nested links and buttons above the abbreviation's stretched
// link overlay (see EventRow).
export const rowControlClass = "relative z-10";

export function deadlineToneClass(r: Pick<RailRow, "kind">): string {
  return r.kind === "next" ? "text-urgent" : "text-fg-3";
}

export function roundLabel(round: Round, idx: number): string {
  return round.name ?? `Round ${idx + 1}`;
}

export function buildRoundRows(
  round: Round,
  now: Date,
  highlightNext = true
): RailRow[] {
  const entries = roundEntries(round).sort(([, a], [, b]) => {
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
    if (name === nextName) return { name, date, kind: "next" as ChipKind };
    return { name, date, kind: "default" as ChipKind };
  });
}

export function EventNameLink({ event: e }: { event: DisplayEvent }) {
  if (!e.url) {
    return (
      <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] text-fg-2">
        {e.name}
      </div>
    );
  }
  return (
    <a
      href={e.url}
      target="_blank"
      aria-label={`Open ${e.abbreviation} website`}
      className={`group/url flex w-fit min-w-0 max-w-full items-baseline gap-1.5 text-[13px] text-fg-2 no-underline ${rowControlClass}`}
      rel="noopener"
    >
      <span
        className={`min-w-0 truncate ${hoverUnderlineClass} group-hover/url:decoration-fg`}
      >
        {e.name}
      </span>
      <ArrowUpRight
        size={11}
        strokeWidth={1.75}
        className="shrink-0 self-center text-fg-3 transition-all duration-200 ease-out group-hover/url:translate-x-0.5 group-hover/url:-translate-y-0.5 group-hover/url:text-fg"
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
              className={`font-medium text-fg-2 underline decoration-border decoration-1 underline-offset-2 transition-[text-decoration-color,color] duration-200 ease-out hover:text-fg hover:decoration-fg ${rowControlClass}`}
            >
              {l.abbreviation}
            </Link>
          ) : (
            <b className="font-medium text-fg-2">{l.abbreviation}</b>
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
      className={`group/dates inline-flex items-center gap-1 self-start text-[12px] font-medium text-fg no-underline ${rowControlClass}`}
      rel="noopener"
    >
      <span
        className={`${hoverUnderlineClass} group-hover/dates:decoration-fg`}
      >
        Dates &amp; Deadlines
      </span>
      <ArrowUpRight
        size={12}
        strokeWidth={1.75}
        className="text-fg-3 transition-all duration-200 ease-out group-hover/dates:-translate-y-0.5 group-hover/dates:translate-x-0.5 group-hover/dates:text-fg"
        aria-hidden
      />
    </a>
  );
}
