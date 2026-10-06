"use client";

import { useSyncExternalStore } from "react";
import type { MaybeDate } from "../lib/event";
import {
  type DateStyle,
  formatDate,
  formatDateRange,
  SERVER_LOCALE,
} from "../lib/date-formatters";

// Dates are server-rendered in SERVER_LOCALE and shown in the viewer's locale
// once hydrated. The hydration render reproduces the server's string with the
// browser's own ICU, which is not guaranteed to match the server's: Chrome 154
// and WebKit put plain spaces around a range's dash where Node puts thin
// spaces, and React 19 throws on any text difference. The element therefore
// opts out of the text check; the store re-render right after hydration
// applies the viewer's locale either way.
const never = () => () => {};

export function useLocalDate(date: MaybeDate, style: DateStyle): string {
  return useSyncExternalStore(
    never,
    () => formatDate(date, style),
    () => formatDate(date, style, SERVER_LOCALE)
  );
}

export function LocalDate({
  date,
  style,
  className,
}: {
  date: MaybeDate;
  style: DateStyle;
  className?: string;
}) {
  return (
    <span className={className} suppressHydrationWarning>
      {useLocalDate(date, style)}
    </span>
  );
}

export function LocalDateRange({
  start,
  end,
  style,
  className,
}: {
  start: MaybeDate;
  end: MaybeDate;
  style: DateStyle;
  className?: string;
}) {
  const text = useSyncExternalStore(
    never,
    () => formatDateRange(start, end, style),
    () => formatDateRange(start, end, style, SERVER_LOCALE)
  );
  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}
