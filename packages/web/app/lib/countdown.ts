import { differenceInCalendarDays } from "date-fns";
import { type MaybeDate, toAoeInstant, toCalendarDate } from "./event";

export function shortCountdown(date: MaybeDate, now: Date): string {
  const instant = toAoeInstant(date);
  const cal = toCalendarDate(date);
  if (!instant || !cal) return "TBD";
  const days = differenceInCalendarDays(cal, now);
  if (days <= 0) {
    const ms = instant.getTime() - now.getTime();
    if (ms <= 0) return "passed";
    const hours = ms / 3_600_000;
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
  const cal = toCalendarDate(date);
  if (!instant || !cal) return "soon";
  const days = differenceInCalendarDays(cal, now);
  if (days <= 0) {
    const ms = instant.getTime() - now.getTime();
    const totalMinutes = Math.floor(ms / 60_000);
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
