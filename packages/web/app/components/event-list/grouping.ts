import type { DisplayEvent } from "../../lib/event-list-view";
import { findNextDeadline } from "../../lib/deadline";

export type Group = {
  key: string;
  date: string | null;
  events: DisplayEvent[];
};

export function buildGroups(events: DisplayEvent[], now: Date): Group[] {
  return events.reduce<Group[]>((acc, event) => {
    const leadDate = findNextDeadline(event, now)?.date ?? null;
    const last = acc[acc.length - 1];
    if (last && last.date === leadDate) {
      last.events.push(event);
      return acc;
    }
    acc.push({
      key: `${leadDate ?? "none"}:${acc.length}`,
      date: leadDate,
      events: [event],
    });
    return acc;
  }, []);
}
