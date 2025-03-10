import { getYear } from "date-fns";
import { ScheduledEvent } from "./event";
import { EventSorterOptions } from "./event-sorter";

export type EventPreferences = {
  hidden: boolean | undefined;
  favorite: boolean | undefined;
};

export type PreferenceCollection = {
  eventPrefs: { [id: string]: EventPreferences };
  sortBy: EventSorterOptions["key"];
};

export const defaultPreferences = {
  eventPrefs: {},
  sortBy: "date",
};

export function eventKey(e: ScheduledEvent): string {
  return `${e.abbreviation}-${getYear(e.date.start)}`;
}
