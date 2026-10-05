import type { Dispatch, SetStateAction } from "react";
import { defaultPreferences, type PreferenceCollection } from "./user-prefs";

const STORAGE_KEY = "userPrefsV2";

type Listener = () => void;

// The storage key is versioned, so anything under it has this exact two-level
// shape; a future shape change means a new key, not a smarter merge.
function parseStored(raw: string): PreferenceCollection {
  const stored = JSON.parse(raw) as Partial<PreferenceCollection>;
  return {
    eventPrefs: { ...defaultPreferences.eventPrefs, ...stored.eventPrefs },
    display: { ...defaultPreferences.display, ...stored.display },
  };
}

let prefs: PreferenceCollection = defaultPreferences;
let loaded = false;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => {
    l();
  });
}

// Listen for writes in other tabs. The `storage` event only fires in tabs OTHER
// than the one that called setItem, so this is the canonical cross-tab signal.
// Without it, a star added in tab A is invisible to tab B, and the next write
// in tab B clobbers A's star.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    if (e.newValue === null) {
      prefs = defaultPreferences;
    } else {
      try {
        prefs = parseStored(e.newValue);
      } catch {
        return;
      }
    }
    loaded = true;
    notify();
  });
}

export const preferencesStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getPrefs(): PreferenceCollection {
    return prefs;
  },
  getServerPrefs(): PreferenceCollection {
    return defaultPreferences;
  },
  isLoaded(): boolean {
    return loaded;
  },
  hydrateFromStorage() {
    if (loaded) return;
    try {
      const item = window?.localStorage.getItem(STORAGE_KEY);
      if (item) {
        prefs = parseStored(item);
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${STORAGE_KEY}":`, error);
    }
    loaded = true;
    notify();
  },
};

export const setPrefs: Dispatch<SetStateAction<PreferenceCollection>> = (
  value
) => {
  // Hydrate first if the user clicked before <PreferencesProvider>'s
  // useEffect fired. Without this, the functional updater receives the
  // default `prefs` and the write below clobbers whatever was in
  // localStorage (saved stars, display prefs).
  if (typeof window !== "undefined" && !loaded) {
    preferencesStore.hydrateFromStorage();
  }
  const next = value instanceof Function ? value(prefs) : value;
  if (next === prefs) return;
  prefs = next;
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  } catch (error) {
    console.error(`Error setting localStorage key "${STORAGE_KEY}":`, error);
  }
  notify();
};

export function toggleFavorite(prefKey: string): void {
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
}
