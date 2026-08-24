"use client";

import { type ReactNode, useEffect, useSyncExternalStore } from "react";
import {
  defaultPreferences,
  type DisplayPreferences,
  type PreferenceCollection,
} from "@/lib/user-prefs";
import { preferencesStore, setPrefs } from "@/lib/preferences-store";

export function PreferencesProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    preferencesStore.hydrateFromStorage();
  }, []);
  return <>{children}</>;
}

function getServerPrefs(): PreferenceCollection {
  return preferencesStore.getServerPrefs();
}

export function usePreferences() {
  const prefs = useSyncExternalStore(
    preferencesStore.subscribe,
    preferencesStore.getPrefs,
    getServerPrefs
  );
  return { prefs, setPrefs, prefsLoaded: usePrefsLoaded() };
}

export function useEventPrefs() {
  return useSyncExternalStore(
    preferencesStore.subscribe,
    selectEventPrefs,
    selectDefaultEventPrefs
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

export function usePrefsLoaded(): boolean {
  return useSyncExternalStore(
    preferencesStore.subscribe,
    preferencesStore.isLoaded,
    returnFalse
  );
}

function selectEventPrefs() {
  return preferencesStore.getPrefs().eventPrefs;
}

function selectDefaultEventPrefs() {
  return defaultPreferences.eventPrefs;
}

function returnFalse() {
  return false;
}
