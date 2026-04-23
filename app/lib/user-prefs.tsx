import { EventSorterOptions } from "./event-sorter";

export type EventPreferences = {
  hidden: boolean | undefined;
  favorite: boolean | undefined;
};

export type FilterPreferences = {
  selectedYear: string;
  selectedCategory: string;
  hiddenItemsFilter: "visible" | "hidden" | "all";
  openSubmissionFilter: "All" | "Filter";
};

export type DisplayPreferences = {
  exactDeadlineTime: boolean;
};

export type PreferenceCollection = {
  eventPrefs: { [id: string]: EventPreferences };
  sortBy: EventSorterOptions["key"];
  filters: FilterPreferences;
  display: DisplayPreferences;
};

export const defaultPreferences: PreferenceCollection = {
  eventPrefs: {},
  sortBy: "date",
  filters: {
    selectedYear: "Any",
    selectedCategory: "Any",
    hiddenItemsFilter: "visible",
    openSubmissionFilter: "All",
  },
  display: {
    exactDeadlineTime: false,
  },
};
