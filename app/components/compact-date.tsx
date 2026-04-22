"use client";

import { useEffect, useState } from "react";
import { dateToCompactString, MaybeDate } from "../lib/event";

export function CompactDate({ date }: { date: MaybeDate }) {
  const [formatted, setFormatted] = useState(() =>
    dateToCompactString(date, "en-US")
  );

  useEffect(() => {
    setFormatted(dateToCompactString(date));
  }, [date]);

  return <>{formatted}</>;
}
