import { type MaybeDate, parseDateParts, toAoeInstant } from "./event";

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;

// UTC calendar-day diff: must stay tz-agnostic so SSR and any viewer-tz
// client render the same string for the same instant.
function utcDaysUntil(date: string, now: Date): number {
  const parts = parseDateParts(date);
  if (!parts) return 0;
  const [y, m, d] = parts;
  const dateMs = Date.UTC(y, m - 1, d);
  const nowMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  return Math.round((dateMs - nowMs) / MS_PER_DAY);
}

export function shortCountdown(date: MaybeDate, now: Date): string {
  if (date === "TBD") return "TBD";
  const instant = toAoeInstant(date);
  if (!instant) return "TBD";
  const days = utcDaysUntil(date, now);
  if (days <= 0) {
    const ms = instant.getTime() - now.getTime();
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

export function humanCountdown(date: string, now: Date): string {
  const instant = toAoeInstant(date);
  if (!instant) return "soon";
  const days = utcDaysUntil(date, now);
  if (days <= 0) {
    const ms = instant.getTime() - now.getTime();
    const totalMinutes = Math.max(0, Math.floor(ms / MS_PER_MINUTE));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const hPart = `${hours} ${hours === 1 ? "hour" : "hours"}`;
    const mPart = `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
    if (hours === 0) return `in ${mPart}`;
    if (minutes === 0) return `in ${hPart}`;
    return `in ${hPart} ${mPart}`;
  }
  if (days === 1) return "tomorrow";
  if (days < 14) return `in ${days} days`;
  if (days < 60) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "in 1 week" : `in ${weeks} weeks`;
  }
  if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? "in 1 month" : `in ${months} months`;
  }
  const years = Math.round(days / 365);
  return years === 1 ? "in 1 year" : `in ${years} years`;
}
