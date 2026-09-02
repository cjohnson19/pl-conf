import type { DisplayEvent } from "../../lib/event-list-view";
import { deadlineStanding } from "../../lib/deadline";
import { parseDateParts } from "../../lib/event";

// Deadline groups head the live list: one per distinct next-deadline date,
// then the events with no deadline listed yet, then those past every listed
// deadline. Month groups head the archive, where no deadline is left to sort
// by.
export type GroupHeading =
  | { kind: "deadline"; date: string }
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

function groupConsecutive(
  events: DisplayEvent[],
  headingOf: (event: DisplayEvent) => GroupHeading
): Group[] {
  return events.reduce<Group[]>((acc, event) => {
    const heading = headingOf(event);
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

export function buildGroups(events: DisplayEvent[], now: Date): Group[] {
  return groupConsecutive(events, (event) => {
    const standing = deadlineStanding(event, now);
    return standing.kind === "upcoming"
      ? { kind: "deadline", date: standing.next.date }
      : { kind: standing.kind };
  });
}

// "YYYY-MM" of the event's start date; "unknown" when it has no concrete one.
export function monthKey(event: DisplayEvent): string {
  const parts =
    event.date.start === "TBD" ? null : parseDateParts(event.date.start);
  if (!parts) return "unknown";
  const [y, m] = parts;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function buildArchiveGroups(events: DisplayEvent[]): Group[] {
  return groupConsecutive(events, (event) => ({
    kind: "month",
    month: monthKey(event),
  }));
}
