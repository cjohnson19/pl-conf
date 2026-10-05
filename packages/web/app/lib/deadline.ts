import {
  type CalendarDate,
  type DateName,
  type ScheduledEvent,
  aoeTime,
  dateNames,
  isDeadlinePast,
  roundDeadlines,
  roundEntries,
} from "./event";

// One listed, non-TBD date of an event with the AoE instant it expires at.
export type DatedEntry = {
  roundIdx: number;
  name: DateName;
  date: CalendarDate;
  time: number;
};

export type DeadlineEvent = Pick<ScheduledEvent, "rounds">;

// Every dated entry across rounds, soonest first: the one walk that sorting,
// grouping, heroes and the row badge all read from.
export function datedEntries(e: DeadlineEvent): DatedEntry[] {
  return e.rounds
    .flatMap((r, roundIdx) =>
      roundEntries(r).flatMap(([name, date]) =>
        date === "TBD" ? [] : [{ roundIdx, name, date, time: aoeTime(date) }]
      )
    )
    .sort((a, b) => a.time - b.time);
}

// A deadline stays open through its final millisecond, matching
// `isDeadlinePast` for a bare date.
const isPast = (d: DatedEntry, now: Date) => d.time < now.getTime();

export function upcomingEntries(e: DeadlineEvent, now: Date): DatedEntry[] {
  return datedEntries(e).filter((d) => !isPast(d, now));
}

export function nextDeadline(
  e: DeadlineEvent,
  now: Date
): DatedEntry | undefined {
  return upcomingEntries(e, now)[0];
}

// Where an event stands in the live list: counting down to its next listed
// deadline, waiting on any deadline to be listed, or past every one that was.
// Past dates alongside TBD entries count as closed — the event has had its
// deadlines go by, so it isn't waiting on a first one.
export type DeadlineStanding =
  | { kind: "upcoming"; next: DatedEntry }
  | { kind: "unlisted" }
  | { kind: "closed" };

export function deadlineStanding(
  e: DeadlineEvent,
  now: Date
): DeadlineStanding {
  const entries = datedEntries(e);
  const next = entries.find((d) => !isPast(d, now));
  if (next) return { kind: "upcoming", next };
  return { kind: entries.length > 0 ? "closed" : "unlisted" };
}

export function isDueThisWeek(e: DeadlineEvent, now: Date): boolean {
  const weekFromNow = now.getTime() + 7 * 86_400_000;
  return upcomingEntries(e, now).some(
    (d) => dateNames[d.name].deadline && d.time <= weekFromNow
  );
}

export function findNextStart(
  e: Pick<ScheduledEvent, "date">,
  now: Date
): { date: CalendarDate; time: number } | undefined {
  if (e.date.start === "TBD") return undefined;
  const time = aoeTime(e.date.start);
  return time < now.getTime() ? undefined : { date: e.date.start, time };
}

// A multi-round event with at least one date behind it and one ahead.
export function isMidMultiRound(e: DeadlineEvent, now: Date): boolean {
  const entries = datedEntries(e);
  return (
    e.rounds.length > 1 &&
    entries.some((d) => isPast(d, now)) &&
    entries.some((d) => !isPast(d, now))
  );
}

export type RoundSlotStatus = "done" | "active" | "next";

// A round's status depends only on its own dates (rounds can overlap, so
// several may be active at once): "done" once every date has passed, "active"
// while mid-flight, and for untouched rounds "active" if every earlier round
// is done, otherwise "next". TBD counts as pending, never as passed.
export function roundStatuses(e: DeadlineEvent, now: Date): RoundSlotStatus[] {
  const facts = e.rounds.map((r) => {
    const dates = roundDeadlines(r);
    return {
      hasPassed: dates.some((d) => isDeadlinePast(d, now)),
      done: dates.length > 0 && dates.every((d) => isDeadlinePast(d, now)),
    };
  });
  return facts.map((f, idx) => {
    if (f.done) return "done";
    if (f.hasPassed) return "active";
    return facts.slice(0, idx).every((p) => p.done) ? "active" : "next";
  });
}
