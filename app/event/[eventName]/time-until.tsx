"use client";

import { formatDuration, Interval, intervalToDuration } from "date-fns";
import React from "react";

export function TimeUntil({ date }: { date: string }) {
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60 * 60 * 60); // Update hourly, it's not that important to be precise

    return () => {
      clearInterval(interval);
    };
  }, []);

  const conferenceDuration: Interval = {
    end: date,
    start: now,
  };

  return (
    <p className="text-muted-foreground leading-none mt-0">
      Starts in{" "}
      {formatDuration(intervalToDuration(conferenceDuration), {
        format: ["years", "months", "days"],
        zero: false,
        delimiter: ", ",
      })}
    </p>
  );
}
