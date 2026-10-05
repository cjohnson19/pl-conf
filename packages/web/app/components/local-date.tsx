"use client";

import { useSyncExternalStore } from "react";
import type { MaybeDate } from "../lib/event";
import {
  type DateStyle,
  formatDate,
  formatDateRange,
  SERVER_LOCALE,
} from "../lib/date-formatters";

// Dates are server-rendered in SERVER_LOCALE. Rendering them again on the
// client would either keep that text for good (suppressHydrationWarning) or
// fail hydration for every other locale. These hydrate with the server's
// string, which the client reproduces exactly, then re-render once with the
// viewer's locale when it differs.
const never = () => () => {};

export function useLocalDate(date: MaybeDate, style: DateStyle): string {
  return useSyncExternalStore(
    never,
    () => formatDate(date, style),
    () => formatDate(date, style, SERVER_LOCALE)
  );
}

export function LocalDate(props: { date: MaybeDate; style: DateStyle }) {
  return useLocalDate(props.date, props.style);
}

export function LocalDateRange({
  start,
  end,
  style,
}: {
  start: MaybeDate;
  end: MaybeDate;
  style: DateStyle;
}) {
  return useSyncExternalStore(
    never,
    () => formatDateRange(start, end, style),
    () => formatDateRange(start, end, style, SERVER_LOCALE)
  );
}
