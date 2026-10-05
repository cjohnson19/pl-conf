import type { Dispatch, SetStateAction } from "react";
import {
  defaultPreferences,
  type DisplayPreferences,
  type PreferenceCollection,
} from "./user-prefs";

const STORAGE_KEY = "userPrefsV2";

// The storage key is versioned, so anything under it has this exact two-level
// shape; a future shape change means a new key, not a smarter merge.
function parseStored(raw: string): PreferenceCollection {
  const stored = JSON.parse(raw) as Partial<PreferenceCollection>;
  return {
    eventPrefs: { ...defaultPreferences.eventPrefs, ...stored.eventPrefs },
    display: { ...defaultPreferences.display, ...stored.display },
  };
}

function readStorage(): PreferenceCollection {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    return item ? parseStored(item) : defaultPreferences;
  } catch (error) {
    console.error(`Error reading localStorage key "${STORAGE_KEY}":`, error);
    return defaultPreferences;
  }
}

// Read once when the client bundle evaluates. Components subscribe through
// useSyncExternalStore with the defaults as the server snapshot, so the
// hydration render matches the server HTML and the saved state applies in the
// re-render right after.
let prefs: PreferenceCollection =
  typeof window === "undefined" ? defaultPreferences : readStorage();
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => {
    listener();
  });
};

// The `storage` event only fires in tabs OTHER than the one that wrote, so it
// is the cross-tab signal: without it a star added in tab A is invisible to
// tab B, and B's next write clobbers it.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    prefs = readStorage();
    notify();
  });
}

export const preferencesStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getPrefs: () => prefs,
  getServerPrefs: () => defaultPreferences,
};

export const setPrefs: Dispatch<SetStateAction<PreferenceCollection>> = (
  value
) => {
  const next = value instanceof Function ? value(prefs) : value;
  if (next === prefs) return;
  prefs = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.error(`Error setting localStorage key "${STORAGE_KEY}":`, error);
  }
  notify();
};

export function setDisplayPref<K extends keyof DisplayPreferences>(
  key: K,
  value: SetStateAction<DisplayPreferences[K]>
): void {
  setPrefs((p) => ({
    ...p,
    display: {
      ...p.display,
      [key]: value instanceof Function ? value(p.display[key]) : value,
    },
  }));
}

export function toggleFavorite(prefKey: string): void {
  setPrefs((prev) => ({
    ...prev,
    eventPrefs: {
      ...prev.eventPrefs,
      [prefKey]: { favorite: !prev.eventPrefs[prefKey]?.favorite },
    },
  }));
}
