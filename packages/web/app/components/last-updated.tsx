"use client";

import { useSyncExternalStore } from "react";
import { type CalendarDate, calendarDate } from "../lib/event";
import { formatDate, SERVER_LOCALE } from "../lib/date-formatters";

const MS_PER_DAY = 86_400_000;
const never = () => () => {};

function relative(date: CalendarDate): string | undefined {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round(
    (today.getTime() - calendarDate(date).getTime()) / MS_PER_DAY
  );
  if (days < 0 || days >= 7) return undefined;
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

// "today" / "3 days ago" within the last week, otherwise the date in the
// viewer's locale; hydrates with the server's en-US string like LocalDate.
export function LastUpdated({ date }: { date: CalendarDate }) {
  return useSyncExternalStore(
    never,
    () => relative(date) ?? formatDate(date, "short"),
    () => formatDate(date, "short", SERVER_LOCALE)
  );
}
