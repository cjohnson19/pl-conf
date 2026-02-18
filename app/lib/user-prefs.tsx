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

export type PreferenceCollection = {
  eventPrefs: { [id: string]: EventPreferences };
  sortBy: EventSorterOptions["key"];
  filters: FilterPreferences;
};

export const defaultPreferences = {
  eventPrefs: {},
  sortBy: "date",
  filters: {
    selectedYear: "Any",
    selectedCategory: "Any",
    hiddenItemsFilter: "visible" as const,
    openSubmissionFilter: "All" as const,
  },
};
