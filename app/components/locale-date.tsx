"use client";

import { useEffect, useState } from "react";
import {
  dateRangeToCompactString,
  dateRangeToString,
  dateToCompactString,
  dateToShortString,
  dateToString,
  MaybeDate,
} from "../lib/event";

type SingleStyle = "long" | "short" | "compact";
type RangeStyle = "long" | "compact";

const singleFormatters: Record<
  SingleStyle,
  (date: MaybeDate, locale?: string) => string
> = {
  long: dateToString,
  short: dateToShortString,
  compact: dateToCompactString,
};

const rangeFormatters: Record<
  RangeStyle,
  (start: MaybeDate, end: MaybeDate, locale?: string) => string
> = {
  long: dateRangeToString,
  compact: dateRangeToCompactString,
};

export function LocaleDate({
  date,
  style,
}: {
  date: MaybeDate;
  style: SingleStyle;
}) {
  const format = singleFormatters[style];
  const [text, setText] = useState(() => format(date, "en-US"));

  useEffect(() => {
    setText(format(date));
  }, [format, date]);

  return <>{text}</>;
}

export function LocaleDateRange({
  start,
  end,
  style,
}: {
  start: MaybeDate;
  end: MaybeDate;
  style: RangeStyle;
}) {
  const format = rangeFormatters[style];
  const [text, setText] = useState(() => format(start, end, "en-US"));

  useEffect(() => {
    setText(format(start, end));
  }, [format, start, end]);

  return <>{text}</>;
}
