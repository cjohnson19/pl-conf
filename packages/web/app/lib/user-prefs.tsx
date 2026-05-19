export type EventPreferences = {
  hidden: boolean | undefined;
  favorite: boolean | undefined;
};

export type DisplayPreferences = {
  includeCalendarDeadlines: boolean;
  introHeroDismissed: boolean;
  deadlineHeroDismissed: boolean;
  collapseHintDismissed: boolean;
  permanentlyHiddenEventHeroes: string[];
  layout: "list" | "grid";
};

export type PreferenceCollection = {
  eventPrefs: { [id: string]: EventPreferences };
  display: DisplayPreferences;
};

export const defaultPreferences: PreferenceCollection = {
  eventPrefs: {},
  display: {
    includeCalendarDeadlines: true,
    introHeroDismissed: false,
    deadlineHeroDismissed: false,
    collapseHintDismissed: false,
    permanentlyHiddenEventHeroes: [],
    layout: "list",
  },
};
