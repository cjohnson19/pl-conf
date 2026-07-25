import type { DisplayEvent } from "../../lib/event-list-view";
import { findNextDeadline } from "../../lib/deadline";
import { parseDateParts } from "../../lib/event";

// Deadline groups head the live list (one per distinct next-deadline date,
// `null` for events whose deadlines have all closed); month groups head the
// archive, where no deadline is left to sort by.
export type GroupHeading =
  | { kind: "deadline"; date: string | null }
  | { kind: "month"; month: string };

export type Group = {
  key: string;
  heading: GroupHeading;
  events: DisplayEvent[];
};

export function buildGroups(events: DisplayEvent[], now: Date): Group[] {
  return events.reduce<Group[]>((acc, event) => {
    const leadDate = findNextDeadline(event, now)?.date ?? null;
    const last = acc[acc.length - 1];
    if (last?.heading.kind === "deadline" && last.heading.date === leadDate) {
      last.events.push(event);
      return acc;
    }
    acc.push({
      key: `${leadDate ?? "none"}:${acc.length}`,
      heading: { kind: "deadline", date: leadDate },
      events: [event],
    });
    return acc;
  }, []);
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
  return events.reduce<Group[]>((acc, event) => {
    const month = monthKey(event);
    const last = acc[acc.length - 1];
    if (last?.heading.kind === "month" && last.heading.month === month) {
      last.events.push(event);
      return acc;
    }
    acc.push({
      key: `${month}:${acc.length}`,
      heading: { kind: "month", month },
      events: [event],
    });
    return acc;
  }, []);
}
