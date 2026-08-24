"use client";

import { useSyncExternalStore } from "react";
import { preferencesStore, toggleFavorite } from "../lib/preferences-store";

export function useFavorite(prefKey: string): {
  on: boolean;
  toggle: () => void;
} {
  const on = useSyncExternalStore(
    preferencesStore.subscribe,
    () => preferencesStore.getPrefs().eventPrefs[prefKey]?.favorite ?? false,
    returnFalse
  );
  return { on, toggle: () => toggleFavorite(prefKey) };
}

function returnFalse() {
  return false;
}
