"use client";

import { useSyncExternalStore } from "react";
import { preferencesStore, setPrefs } from "./preferences-store";

export function useFavorite(prefKey: string): {
  on: boolean;
  toggle: () => void;
} {
  const on = useSyncExternalStore(
    preferencesStore.subscribe,
    () => preferencesStore.getPrefs().eventPrefs[prefKey]?.favorite ?? false,
    returnFalse
  );
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

function returnFalse() {
  return false;
}
