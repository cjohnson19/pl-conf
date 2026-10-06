export type EventPreferences = {
  favorite: boolean | undefined;
};

export type DisplayPreferences = {
  includeCalendarDeadlines: boolean;
  deadlineHeroDismissed: boolean;
  collapseHintDismissed: boolean;
  permanentlyHiddenEventHeroes: string[];
};

export type PreferenceCollection = {
  eventPrefs: { [id: string]: EventPreferences };
  display: DisplayPreferences;
};

export const defaultPreferences: PreferenceCollection = {
  eventPrefs: {},
  display: {
    includeCalendarDeadlines: true,
    deadlineHeroDismissed: false,
    collapseHintDismissed: false,
    permanentlyHiddenEventHeroes: [],
  },
};

export function collectStarredKeys(
  eventPrefs: PreferenceCollection["eventPrefs"]
): Set<string> {
  return new Set(
    Object.entries(eventPrefs)
      .filter(([, v]) => v?.favorite)
      .map(([k]) => k)
  );
}
