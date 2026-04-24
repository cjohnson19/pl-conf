import * as ics from "ics";
import { dateNameToReadable } from "./event.js";
import type { DateName, ScheduledEvent } from "./schemas.js";

export function toICal(
  e: ScheduledEvent,
  includeDates: boolean = false
): string {
  if (e.date.start === "TBD" || e.date.end === "TBD") {
    return "";
  }
  const start = new Date(e.date.start);
  const end = new Date(e.date.end);
  const iCalEvent = ics.createEvents(
    [
      {
        start: [start.getFullYear(), start.getMonth() + 1, start.getDate()],
        end: [end.getFullYear(), end.getMonth() + 1, end.getDate()],
        title: e.abbreviation,
        description: e.name,
        location: e.location,
        url: e.url,
        categories: [e.type, ...e.tags],
      },
      ...(!includeDates
        ? []
        : e.rounds.flatMap((round) =>
            Object.entries(round.importantDates).flatMap(([type, date]) => {
              if (date === "TBD") {
                return [];
              }
              const d = new Date(date);
              const readable = dateNameToReadable(type as DateName);
              const roundLabel = round.name ? `${round.name} – ` : "";
              return [
                {
                  start: [
                    d.getFullYear(),
                    d.getMonth() + 1,
                    d.getDate(),
                  ] as ics.DateTime,
                  end: [
                    d.getFullYear(),
                    d.getMonth() + 1,
                    d.getDate(),
                  ] as ics.DateTime,
                  title: `${e.abbreviation}: ${roundLabel}${readable}`,
                  description: `${e.name}: ${roundLabel}${readable}`,
                  url: e.url,
                },
              ];
            })
          )),
    ],
    {
      productId: "pl-conferences/ics",
      method: "PUBLISH",
    }
  );
  if (iCalEvent.error) {
    throw new Error(iCalEvent.error.message);
  }
  return iCalEvent.value!;
}
