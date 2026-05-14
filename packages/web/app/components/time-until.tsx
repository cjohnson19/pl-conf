"use client";

import { formatDuration, Interval, intervalToDuration } from "date-fns";
import React from "react";
import { toAoeInstant } from "../lib/event";

const HOUR_MS = 1000 * 60 * 60;
const MINUTE_MS = 1000 * 60;
const DAY_MS = 24 * HOUR_MS;

export function TimeUntil({
  date,
  prefix,
}: {
  date: string;
  prefix?: string;
} & React.ComponentPropsWithoutRef<"p">) {
  const [now, setNow] = React.useState<Date | null>(null);
  const deadline = React.useMemo(() => toAoeInstant(date), [date]);

  React.useEffect(() => {
    setNow(new Date());
    if (!deadline) return;
    if (new Date().getTime() > deadline.getTime()) return;

    const withinDay = deadline.getTime() - new Date().getTime() <= DAY_MS;
    const tick = withinDay ? MINUTE_MS : HOUR_MS;
    const interval = setInterval(() => setNow(new Date()), tick);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!now || !deadline) return null;

  const remaining = deadline.getTime() - now.getTime();
  if (remaining <= 0) return <>{prefix ? prefix + " " : null}Passed</>;

  const interval: Interval = { start: now, end: deadline };
  const duration = intervalToDuration(interval);
  const format =
    remaining <= DAY_MS
      ? (["hours", "minutes"] as const)
      : (["years", "months", "days"] as const);

  return (
    <>
      {prefix ? prefix + " " : null}
      {formatDuration(duration, {
        format: [...format],
        zero: false,
        delimiter: ", ",
      })}
    </>
  );
}
