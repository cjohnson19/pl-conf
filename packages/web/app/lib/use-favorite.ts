"use client";

import { usePreferences } from "../components/preferences-provider";

export function useFavorite(prefKey: string): {
  on: boolean;
  toggle: () => void;
} {
  const { prefs, setPrefs } = usePreferences();
  const on = prefs.eventPrefs[prefKey]?.favorite ?? false;
  const toggle = () =>
    setPrefs((prev) => ({
      ...prev,
      eventPrefs: {
        ...prev.eventPrefs,
        [prefKey]: {
          ...prev.eventPrefs[prefKey],
          favorite: !(prev.eventPrefs[prefKey]?.favorite ?? false),
        },
      },
    }));
  return { on, toggle };
}
