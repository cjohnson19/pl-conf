import {
  type DateName,
  type MaybeDate,
  type ScheduledEvent,
  allDeadlines,
  isDeadline,
  isDeadlinePast,
  toAoeInstant,
} from "./event";

export type NextDeadline = {
  roundIdx: number;
  name: DateName;
  date: string;
  time: number;
};

type DeadlineEvent = Pick<ScheduledEvent, "rounds">;
type StartEvent = Pick<ScheduledEvent, "date">;

export function findNextDeadline(
  e: DeadlineEvent,
  now: Date,
  options: { fallbackToPast?: boolean } = {}
): NextDeadline | null {
  const nowTime = now.getTime();
  let upcoming: NextDeadline | null = null;
  let fallback: NextDeadline | null = null;
  e.rounds.forEach((r, roundIdx) => {
    (Object.entries(r.importantDates) as Array<[DateName, MaybeDate]>).forEach(
      ([name, date]) => {
        if (date === "TBD" || date === undefined) return;
        const instant = toAoeInstant(date);
        if (!instant) return;
        const time = instant.getTime();
        const candidate = { roundIdx, name, date, time };
        if (time > nowTime) {
          if (!upcoming || time < upcoming.time) upcoming = candidate;
        } else if (options.fallbackToPast) {
          if (!fallback || time > fallback.time) fallback = candidate;
        }
      }
    );
  });
  return upcoming ?? fallback;
}

export function findAllUpcomingDeadlines(
  e: DeadlineEvent,
  now: Date
): NextDeadline[] {
  const nowTime = now.getTime();
  const out: NextDeadline[] = [];
  e.rounds.forEach((r, roundIdx) => {
    (Object.entries(r.importantDates) as Array<[DateName, MaybeDate]>).forEach(
      ([name, date]) => {
        if (date === "TBD" || date === undefined) return;
        const instant = toAoeInstant(date);
        if (!instant) return;
        const time = instant.getTime();
        if (time > nowTime) out.push({ roundIdx, name, date, time });
      }
    );
  });
  out.sort((a, b) => a.time - b.time);
  return out;
}

export function isDueThisWeek(e: DeadlineEvent, now: Date): boolean {
  const weekMs = 7 * 86_400_000;
  return e.rounds.some((r) =>
    (Object.entries(r.importantDates) as Array<[DateName, MaybeDate]>).some(
      ([name, date]) => {
        if (!isDeadline(name)) return false;
        if (date === "TBD" || date === undefined) return false;
        const instant = toAoeInstant(date);
        if (!instant) return false;
        const diff = instant.getTime() - now.getTime();
        return diff > 0 && diff <= weekMs;
      }
    )
  );
}

export function findNextStart(
  e: StartEvent,
  now: Date
): { date: string; time: number } | null {
  if (e.date.start === "TBD") return null;
  const instant = toAoeInstant(e.date.start);
  if (!instant) return null;
  const time = instant.getTime();
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
    const dates = allDeadlines({ rounds: [r] });
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
  const dates = allDeadlines(e).filter((d) => d !== "TBD");
  return (
    e.rounds.length > 1 &&
    dates.some((d) => isDeadlinePast(d, now)) &&
    dates.some((d) => !isDeadlinePast(d, now))
  );
}
