import type { DeadlineStanding } from "../../lib/deadline";
import type { CalendarDate, ScheduledEvent } from "../../lib/event";
import type { DisplayEvent } from "../../lib/event-list-view";

// Deadline groups head the live list: one per distinct next-deadline date,
// then the events with no deadline listed yet, then those past every listed
// deadline. Month groups head the archive, where no deadline is left to sort
// by.
export type GroupHeading =
  | { kind: "deadline"; date: CalendarDate }
  | { kind: "unlisted" }
  | { kind: "closed" }
  | { kind: "month"; month: string };

export type Group = {
  key: string;
  heading: GroupHeading;
  events: DisplayEvent[];
};

// Names a heading stably across renders and sessions: the date or month it
// carries, or the kind itself for the two catch-alls.
export function headingId(heading: GroupHeading): string {
  if (heading.kind === "deadline") return heading.date;
  if (heading.kind === "month") return heading.month;
  return heading.kind;
}

export function liveHeading(standing: DeadlineStanding): GroupHeading {
  return standing.kind === "upcoming"
    ? { kind: "deadline", date: standing.next.date }
    : { kind: standing.kind };
}

// "YYYY-MM" of the event's start date; "unknown" when it has no concrete one.
export function monthHeading(e: Pick<ScheduledEvent, "date">): GroupHeading {
  const start = e.date.start;
  return {
    kind: "month",
    month: start === "TBD" ? "unknown" : start.slice(0, 7).replace("/", "-"),
  };
}

// The list arrives sorted, so events under one heading are adjacent and each
// run becomes a group.
export function groupConsecutive(
  items: { event: DisplayEvent; heading: GroupHeading }[]
): Group[] {
  return items.reduce<Group[]>((acc, { event, heading }) => {
    const last = acc[acc.length - 1];
    if (last && headingId(last.heading) === headingId(heading)) {
      last.events.push(event);
      return acc;
    }
    acc.push({
      key: `${headingId(heading)}:${acc.length}`,
      heading,
      events: [event],
    });
    return acc;
  }, []);
}
