"use client";

import { useEffect, useState } from "react";
import {
  DateFormatStyle,
  formatDate,
  formatDateRange,
  MaybeDate,
} from "../lib/event";

export function LocaleDate({
  date,
  style,
}: {
  date: MaybeDate;
  style: DateFormatStyle;
}) {
  const [text, setText] = useState(() => formatDate(date, style, "en-US"));
  useEffect(() => setText(formatDate(date, style)), [date, style]);
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
