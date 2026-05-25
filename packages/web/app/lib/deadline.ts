import {
  type DateName,
  type MaybeDate,
  type ScheduledEvent,
  isDeadline,
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

export type RoundSlot = {
  idx: number;
  status: RoundSlotStatus;
};

export function pickMultiRoundSlots(
  totalRounds: number,
  activeRoundIdx: number
): { left: RoundSlot | null; right: RoundSlot } {
  const active: RoundSlot = { idx: activeRoundIdx, status: "active" };
  if (activeRoundIdx > 0) {
    return {
      left: { idx: activeRoundIdx - 1, status: "done" },
      right: active,
    };
  }
  if (totalRounds > 1) {
    return { left: active, right: { idx: 1, status: "next" } };
  }
  return { left: null, right: active };
}
