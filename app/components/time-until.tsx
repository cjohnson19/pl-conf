"use client";

import {
  endOfDay,
  formatDuration,
  Interval,
  intervalToDuration,
  isSameDay,
} from "date-fns";
import React from "react";

export function TimeUntil({
  date,
  prefix,
}: {
  date: string;
  prefix?: string;
} & React.ComponentPropsWithoutRef<"p">) {
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());

    if (new Date().getTime() > new Date(date).getTime()) {
      return;
    }
    const interval = setInterval(
      () => {
        setNow(new Date());
      },
      1000 * 60 * 60
    ); // Update hourly, it's not that important to be precise

    return () => {
      clearInterval(interval);
    };
  }, [date]);

  if (!now) {
    return null;
  }

  const timeUntilDuration: Interval = {
    start: now,
    end: endOfDay(date),
  };

  const isPast = now.getTime() > endOfDay(date).getTime();
  const duration = intervalToDuration(timeUntilDuration);
  const sameDay = isSameDay(now, endOfDay(date));

  return (
    <>
      {prefix ? prefix + " " : null}
      {sameDay
        ? "Today"
        : isPast
          ? "Past"
          : formatDuration(duration, {
              format: ["years", "months", "days"],
              zero: false,
              delimiter: ", ",
            })}
    </>
  );
}
