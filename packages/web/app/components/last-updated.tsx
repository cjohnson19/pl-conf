"use client";

import { useEffect, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import { formatDate } from "../lib/event";

function relative(date: string): string | null {
  const days = differenceInCalendarDays(new Date(), new Date(date));
  if (days < 0 || days >= 7) return null;
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function LastUpdated({ date }: { date: string }) {
  const [text, setText] = useState(() => formatDate(date, "short", "en-US"));
  useEffect(() => {
    setText(relative(date) ?? formatDate(date, "short"));
  }, [date]);
  return <>{text}</>;
}
