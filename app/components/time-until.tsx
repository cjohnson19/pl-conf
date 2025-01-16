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
  ...props
}: {
  date: string;
  prefix?: string;
} & React.ComponentPropsWithoutRef<"p">) {
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    if (now.getTime() > new Date(date).getTime()) {
      return;
    }
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000 * 60 * 60); // Update hourly, it's not that important to be precise

    return () => {
      clearInterval(interval);
    };
  });

  const timeUntilDuration: Interval = {
    start: now,
    end: endOfDay(date),
  };

  const isPast = now.getTime() > endOfDay(date).getTime();
  const duration = intervalToDuration(timeUntilDuration);
  const sameDay = isSameDay(now, endOfDay(date));

  return (
    <p {...props}>
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
    </p>
  );
}
