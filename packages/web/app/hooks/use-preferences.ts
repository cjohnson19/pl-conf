"use client";

import { useSyncExternalStore } from "react";
import { preferencesStore } from "../lib/preferences-store";
import { defaultPreferences, type DisplayPreferences } from "../lib/user-prefs";

const never = () => () => {};

// False during server rendering and hydration, true from the first client
// render after. Gate anything that must not flash a default before the saved
// preferences apply (a starred count of 0, the "nothing starred" note).
export function useHydrated(): boolean {
  return useSyncExternalStore(
    never,
    () => true,
    () => false
  );
}

export function useEventPrefs() {
  return useSyncExternalStore(
    preferencesStore.subscribe,
    () => preferencesStore.getPrefs().eventPrefs,
    () => defaultPreferences.eventPrefs
  );
}

export function useDisplayPref<K extends keyof DisplayPreferences>(
  key: K
): DisplayPreferences[K] {
  return useSyncExternalStore(
    preferencesStore.subscribe,
    () => preferencesStore.getPrefs().display[key],
    () => defaultPreferences.display[key]
  );
}
