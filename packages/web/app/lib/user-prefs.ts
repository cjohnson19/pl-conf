export type EventPreferences = {
  hidden: boolean | undefined;
  favorite: boolean | undefined;
};

export type DisplayPreferences = {
  includeCalendarDeadlines: boolean;
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
    deadlineHeroDismissed: false,
    collapseHintDismissed: false,
    permanentlyHiddenEventHeroes: [],
    layout: "list",
  },
};

// Starred keys usually exclude hidden events — a hidden event's star shouldn't
// count toward badges or heroes. `includeHidden` is for consumers that operate
// on the row itself (star toggling, per-row CSS), where hidden rows still exist.
export function collectStarredKeys(
  eventPrefs: PreferenceCollection["eventPrefs"],
  options: { includeHidden?: boolean } = {}
): Set<string> {
  return new Set(
    Object.entries(eventPrefs)
      .filter(([, v]) => v?.favorite && (options.includeHidden || !v.hidden))
      .map(([k]) => k)
  );
}
