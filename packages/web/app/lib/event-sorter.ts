export {
  type EventSorter,
  sortWith,
  sortByFirstDeadline,
  sortByEventDate,
  sortByLastUpdated,
  compose,
} from "@pl-conf/core";
import {
  type EventSorter,
  sortByEventDate,
  sortByFirstDeadline,
  sortByLastUpdated,
} from "@pl-conf/core";

export type EventSorterOptions = {
  key: string;
  f: EventSorter;
  label: string;
};

export const sorters: EventSorterOptions[] = [
  {
    key: "date",
    f: sortByEventDate,
    label: "Event date",
  },
  {
    key: "deadline",
    f: sortByFirstDeadline,
    label: "Earliest deadline",
  },
  {
    key: "lastUpdated",
    f: sortByLastUpdated,
    label: "Last updated",
  },
];
