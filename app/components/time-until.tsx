"use client";

import { formatDuration, Interval, intervalToDuration } from "date-fns";
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
      console.log("updating", date);
      setNow(new Date());
    }, 1000 * 60 * 60); // Update hourly, it's not that important to be precise

    return () => {
      clearInterval(interval);
    };
  });

  const conferenceDuration: Interval = {
    end: date,
    start: now,
  };

  const isPast = now.getTime() > new Date(date).getTime();

  return (
    <p {...props}>
      {prefix ? prefix + " " : null}
      {isPast
        ? "Past"
        : formatDuration(intervalToDuration(conferenceDuration), {
            format: ["years", "months", "days"],
            zero: false,
            delimiter: ", ",
          })}
    </p>
  );
}
