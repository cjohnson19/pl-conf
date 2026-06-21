import { type MaybeDate, parseDateParts, toAoeInstant } from "./event";

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;
// AOE is UTC-12; shifting an instant back by this lands on its AOE wall-clock.
const AOE_OFFSET_MS = 12 * MS_PER_HOUR;

// Whole-day diff measured on the AOE (UTC-12) calendar — the same clock the
// hours branch counts down to (toAoeInstant is end-of-day in UTC-12). Anchoring
// "today" to UTC-midnight of `now` instead placed the deadline ~36h before its
// real AOE moment, so a deadline two AOE days out could read as "tomorrow"
// while a one-day-out deadline simultaneously showed "in 33 hours". Shifting
// `now` by a fixed offset keeps this tz-agnostic: SSR and any viewer-tz client
// render the same string for the same instant.
function aoeDaysUntil(date: string, now: Date): number {
  const parts = parseDateParts(date);
  if (!parts) return 0;
  const [y, m, d] = parts;
  const dateMs = Date.UTC(y, m - 1, d);
  const aoeNow = new Date(now.getTime() - AOE_OFFSET_MS);
  const nowMs = Date.UTC(
    aoeNow.getUTCFullYear(),
    aoeNow.getUTCMonth(),
    aoeNow.getUTCDate()
  );
  return Math.round((dateMs - nowMs) / MS_PER_DAY);
}

export function shortCountdown(date: MaybeDate, now: Date): string {
  if (date === "TBD") return "TBD";
  const instant = toAoeInstant(date);
  if (!instant) return "TBD";
  const days = aoeDaysUntil(date, now);
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
  const days = aoeDaysUntil(date, now);
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
