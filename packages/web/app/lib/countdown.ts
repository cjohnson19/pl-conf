import { type CalendarDate, aoeTime } from "./event";

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;

// Whole AoE days until the deadline: 0 on its last AoE day, 1 the day before.
// Measured against the deadline's own AoE instant, so SSR and any viewer tz
// agree for the same `now`.
const aoeDaysUntil = (date: CalendarDate, now: Date) =>
  Math.floor((aoeTime(date) - now.getTime()) / MS_PER_DAY);

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

export function shortCountdown(date: CalendarDate, now: Date): string {
  const days = aoeDaysUntil(date, now);
  if (days <= 0) {
    const ms = aoeTime(date) - now.getTime();
    if (ms <= 0) return "passed";
    const hours = ms / MS_PER_HOUR;
    if (hours < 1) return "<1h";
    return `${Math.round(hours)}h`;
  }
  if (days < 14) return `${days}d`;
  if (days < 36) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}

export function humanCountdown(date: CalendarDate, now: Date): string {
  const days = aoeDaysUntil(date, now);
  if (days <= 0) {
    const ms = aoeTime(date) - now.getTime();
    const totalMinutes = Math.max(0, Math.floor(ms / MS_PER_MINUTE));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `in ${plural(minutes, "minute")}`;
    if (minutes === 0) return `in ${plural(hours, "hour")}`;
    return `in ${plural(hours, "hour")} ${plural(minutes, "minute")}`;
  }
  if (days === 1) return "tomorrow";
  if (days < 14) return `in ${plural(days, "day")}`;
  if (days < 60) return `in ${plural(Math.round(days / 7), "week")}`;
  if (days < 365) return `in ${plural(Math.round(days / 30), "month")}`;
  return `in ${plural(Math.round(days / 365), "year")}`;
}
