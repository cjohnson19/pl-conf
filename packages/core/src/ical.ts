import * as ics from "ics";
import {
  dateNameToReadable,
  eventKey,
  hasConcreteDates,
  parseDateParts,
} from "./event";
import type { DateName, ScheduledEvent } from "./schemas";

const UID_DOMAIN = "pl-conferences.com";

const AOE_NOTE =
  "Deadline is end-of-day Anywhere on Earth (AoE, UTC-12). If you are east of UTC-12, the absolute deadline is later than midnight local time on this date.";

function ymdParts(date: string): [number, number, number] {
  const parts = parseDateParts(date);
  if (!parts) throw new Error(`Invalid date: ${date}`);
  return parts;
}

function lastModifiedArray(date: string): ics.DateArray {
  const [y, m, d] = ymdParts(date);
  return [y, m, d, 12, 0];
}

export function toICal(
  e: ScheduledEvent,
  includeDates: boolean = false
): string {
  if (!hasConcreteDates(e)) {
    return "";
  }
  const key = eventKey(e);
  const sequence = e.sequence;
  const lastModified = lastModifiedArray(e.lastUpdated);
  const [sy, sm, sd] = ymdParts(e.date.start);
  const [ey, em, ed] = ymdParts(e.date.end);
  const calName = `${e.abbreviation} ${sy} - PL Conferences`;
  const iCalEvent = ics.createEvents(
    [
      {
        uid: `${key}@${UID_DOMAIN}`,
        sequence,
        lastModified,
        start: [sy, sm, sd],
        end: [ey, em, ed],
        title: e.abbreviation,
        description: e.name,
        location: e.location,
        url: e.url,
        categories: [e.type, ...e.tags],
      },
      ...(!includeDates
        ? []
        : e.rounds.flatMap((round, roundIdx) =>
            Object.entries(round.importantDates).flatMap(([type, date]) => {
              if (date === "TBD") {
                return [];
              }
              const [dy, dm, dd] = ymdParts(date);
              const readable = dateNameToReadable(type as DateName);
              const roundLabel = round.name ? `${round.name} – ` : "";
              return [
                {
                  uid: `${key}-r${roundIdx}-${type}@${UID_DOMAIN}`,
                  sequence,
                  lastModified,
                  start: [dy, dm, dd] as ics.DateTime,
                  end: [dy, dm, dd] as ics.DateTime,
                  title: `${e.abbreviation}: ${roundLabel}${readable}`,
                  description: `${e.name}: ${roundLabel}${readable}\n\n${AOE_NOTE}`,
                  url: e.url,
                },
              ];
            })
          )),
    ],
    {
      productId: "pl-conferences/ics",
      method: "PUBLISH",
      calName,
    }
  );
  if (iCalEvent.error) {
    throw new Error(iCalEvent.error.message);
  }
  return iCalEvent.value!;
}
