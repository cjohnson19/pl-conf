import {
  type DateName,
  type ScheduledEvent,
  allDeadlines,
  isDeadline,
  isDeadlinePast,
  roundDeadlines,
  roundEntries,
  toAoeInstant,
} from "./event";

export type NextDeadline = {
  roundIdx: number;
  name: DateName;
  date: string;
  time: number;
};

export type DeadlineEvent = Pick<ScheduledEvent, "rounds">;
type StartEvent = Pick<ScheduledEvent, "date">;

export function findNextDeadline(
  e: DeadlineEvent,
  now: Date
): NextDeadline | undefined {
  return findAllUpcomingDeadlines(e, now)[0];
}

// Where an event stands in the live list: counting down to its next listed
// deadline, waiting on any deadline to be listed, or past every one that was.
// Past dates alongside TBD entries count as closed — the event has had its
// deadlines go by, so it isn't waiting on a first one.
export type DeadlineStanding =
  | { kind: "upcoming"; next: NextDeadline }
  | { kind: "unlisted" }
  | { kind: "closed" };

export function deadlineStanding(
  e: DeadlineEvent,
  now: Date
): DeadlineStanding {
  const next = findNextDeadline(e, now);
  if (next) return { kind: "upcoming", next };
  const listed = allDeadlines(e).some((d) => d !== "TBD");
  return { kind: listed ? "closed" : "unlisted" };
}

export function findAllUpcomingDeadlines(
  e: DeadlineEvent,
  now: Date
): NextDeadline[] {
  const nowTime = now.getTime();
  const out: NextDeadline[] = [];
  e.rounds.forEach((r, roundIdx) => {
    roundEntries(r).forEach(([name, date]) => {
      if (date === "TBD") return;
      const time = toAoeInstant(date)!.getTime();
      if (time > nowTime) out.push({ roundIdx, name, date, time });
    });
  });
  out.sort((a, b) => a.time - b.time);
  return out;
}

export function isDueThisWeek(e: DeadlineEvent, now: Date): boolean {
  const weekMs = 7 * 86_400_000;
  return e.rounds.some((r) =>
    roundEntries(r).some(([name, date]) => {
      if (!isDeadline(name)) return false;
      if (date === "TBD") return false;
      const diff = toAoeInstant(date)!.getTime() - now.getTime();
      return diff > 0 && diff <= weekMs;
    })
  );
}

export function findNextStart(
  e: StartEvent,
  now: Date
): { date: string; time: number } | null {
  if (e.date.start === "TBD") return null;
  const time = toAoeInstant(e.date.start)!.getTime();
  if (time <= now.getTime()) return null;
  return { date: e.date.start, time };
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

export function isMidMultiRound(e: DeadlineEvent, now: Date): boolean {
  const dates = e.rounds.flatMap(roundDeadlines).filter((d) => d !== "TBD");
  return (
    e.rounds.length > 1 &&
    dates.some((d) => isDeadlinePast(d, now)) &&
    dates.some((d) => !isDeadlinePast(d, now))
  );
}
