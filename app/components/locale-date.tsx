"use client";

import { useEffect, useState } from "react";
import {
  DateFormatStyle,
  formatDate,
  formatDateRange,
  MaybeDate,
} from "../lib/event";
import { usePreferences } from "./preferences-provider";

const withTimeStyle: Partial<Record<DateFormatStyle, DateFormatStyle>> = {
  long: "long-with-time",
  compact: "compact-with-time",
};

export function LocaleDate({
  date,
  style,
  aoe,
}: {
  date: MaybeDate;
  style: DateFormatStyle;
  aoe?: boolean;
}) {
  const { prefs } = usePreferences();
  const effectiveStyle =
    aoe && prefs.display.exactDeadlineTime
      ? (withTimeStyle[style] ?? style)
      : style;

  const [text, setText] = useState(() =>
    formatDate(date, effectiveStyle, "en-US")
  );
  useEffect(
    () => setText(formatDate(date, effectiveStyle)),
    [date, effectiveStyle]
  );
  return <>{text}</>;
}

export function LocaleDateRange({
  start,
  end,
  style,
}: {
  start: MaybeDate;
  end: MaybeDate;
  style: DateFormatStyle;
}) {
  const [text, setText] = useState(() =>
    formatDateRange(start, end, style, "en-US")
  );
  useEffect(
    () => setText(formatDateRange(start, end, style)),
    [start, end, style]
  );
  return <>{text}</>;
}
