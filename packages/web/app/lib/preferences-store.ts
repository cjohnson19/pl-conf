import type { Dispatch, SetStateAction } from "react";
import { defaultPreferences, type PreferenceCollection } from "./user-prefs";

const STORAGE_KEY = "userPrefsV2";

type Listener = () => void;

function isObject(item: unknown): item is Record<string, unknown> {
  return !!item && typeof item === "object" && !Array.isArray(item);
}

function mergeDeep<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>
): T {
  if (!isObject(target) || !isObject(source)) return target;
  const out: Record<string, unknown> = { ...target };
  for (const key in source) {
    const sourceVal = source[key];
    const targetVal = out[key];
    if (isObject(sourceVal) && isObject(targetVal)) {
      out[key] = mergeDeep(targetVal, sourceVal);
    } else if (sourceVal !== undefined) {
      out[key] = sourceVal;
    }
  }
  return out as T;
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
        prefs = mergeDeep(defaultPreferences, JSON.parse(e.newValue));
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
        prefs = mergeDeep(defaultPreferences, JSON.parse(item));
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
  // localStorage (saved stars, hidden flags, display prefs).
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
