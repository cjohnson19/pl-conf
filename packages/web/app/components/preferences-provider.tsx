"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BUILD_NOW_MS } from "@pl-conf/data";
import {
  defaultPreferences,
  type PreferenceCollection,
} from "@/lib/user-prefs";

export type View = "starred" | "all" | "submissions";
export type Layout = "list" | "grid";

const LOCAL_PREFS_KEY = "userPrefsV2";
const SESSION_VIEW_KEY = "view";
const SESSION_COLLAPSED_KEY = "collapsedDateGroups";
const SESSION_DISMISSED_HERO_KEY = "dismissedHeroKeys";

type SessionState = {
  view: View;
  collapsedDates: Set<string>;
  dismissedHeroKeys: Set<string>;
};

type ProviderState = {
  prefs: PreferenceCollection;
  session: SessionState;
  now: Date;
  hydrated: boolean;
};

type Setters = {
  setPrefs: Dispatch<SetStateAction<PreferenceCollection>>;
  setView: (view: View) => void;
  toggleCollapsed: (date: string) => void;
  dismissHero: (key: string) => void;
  setNow: (now: Date) => void;
};

const ValueContext = createContext<ProviderState | null>(null);
const SettersContext = createContext<Setters | null>(null);

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

function readPrefs(): PreferenceCollection {
  try {
    const raw = window.localStorage.getItem(LOCAL_PREFS_KEY);
    if (raw === null) return defaultPreferences;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return mergeDeep(defaultPreferences, parsed);
  } catch {
    return defaultPreferences;
  }
}

function readView(): View | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_VIEW_KEY);
    if (raw === "starred" || raw === "all" || raw === "submissions") return raw;
    return null;
  } catch {
    return null;
  }
}

function readStringSet(key: string): Set<string> {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (raw === null) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((v) => typeof v === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}

const SSR_STATE: ProviderState = {
  prefs: defaultPreferences,
  session: {
    view: "all",
    collapsedDates: new Set(),
    dismissedHeroKeys: new Set(),
  },
  now: new Date(BUILD_NOW_MS),
  hydrated: false,
};

function computeInitialClientState(): ProviderState {
  const prefs = readPrefs();
  const storedView = readView();
  const hasStarred = Object.values(prefs.eventPrefs).some(
    (v) => v?.favorite === true
  );
  const view: View = storedView ?? (hasStarred ? "starred" : "all");
  const realMs = Date.now();
  const now =
    realMs - BUILD_NOW_MS > 60_000 ? new Date(realMs) : new Date(BUILD_NOW_MS);
  return {
    prefs,
    session: {
      view,
      collapsedDates: readStringSet(SESSION_COLLAPSED_KEY),
      dismissedHeroKeys: readStringSet(SESSION_DISMISSED_HERO_KEY),
    },
    now,
    hydrated: false,
  };
}

function writeLocal(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function writeSession(key: string, value: unknown) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function writeSessionRaw(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {}
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProviderState>(() =>
    typeof window === "undefined" ? SSR_STATE : computeInitialClientState()
  );

  useEffect(() => {
    setState((prev) => (prev.hydrated ? prev : { ...prev, hydrated: true }));
  }, []);

  const setters = useMemo<Setters>(() => {
    const setPrefs: Setters["setPrefs"] = (updater) => {
      setState((prev) => {
        const nextPrefs =
          typeof updater === "function"
            ? (updater as (p: PreferenceCollection) => PreferenceCollection)(
                prev.prefs
              )
            : updater;
        writeLocal(LOCAL_PREFS_KEY, nextPrefs);
        return { ...prev, prefs: nextPrefs };
      });
    };
    const setView: Setters["setView"] = (view) => {
      setState((prev) => {
        if (prev.session.view === view) return prev;
        writeSessionRaw(SESSION_VIEW_KEY, view);
        return { ...prev, session: { ...prev.session, view } };
      });
    };
    const toggleCollapsed: Setters["toggleCollapsed"] = (date) => {
      setState((prev) => {
        const next = new Set(prev.session.collapsedDates);
        if (next.has(date)) next.delete(date);
        else next.add(date);
        writeSession(SESSION_COLLAPSED_KEY, Array.from(next));
        return { ...prev, session: { ...prev.session, collapsedDates: next } };
      });
    };
    const dismissHero: Setters["dismissHero"] = (key) => {
      setState((prev) => {
        if (prev.session.dismissedHeroKeys.has(key)) return prev;
        const next = new Set(prev.session.dismissedHeroKeys);
        next.add(key);
        writeSession(SESSION_DISMISSED_HERO_KEY, Array.from(next));
        return {
          ...prev,
          session: { ...prev.session, dismissedHeroKeys: next },
        };
      });
    };
    const setNow: Setters["setNow"] = (now) => {
      setState((prev) =>
        prev.now.getTime() === now.getTime() ? prev : { ...prev, now }
      );
    };
    return { setPrefs, setView, toggleCollapsed, dismissHero, setNow };
  }, []);

  return (
    <SettersContext.Provider value={setters}>
      <ValueContext.Provider value={state}>{children}</ValueContext.Provider>
    </SettersContext.Provider>
  );
}

function useValue(): ProviderState {
  const v = useContext(ValueContext);
  if (!v) throw new Error("usePreferences requires PreferencesProvider");
  return v;
}

function useSetters(): Setters {
  const s = useContext(SettersContext);
  if (!s) throw new Error("usePreferences requires PreferencesProvider");
  return s;
}

export function usePreferences(): {
  prefs: PreferenceCollection;
  setPrefs: Setters["setPrefs"];
  prefsLoaded: boolean;
} {
  const { prefs, hydrated } = useValue();
  const { setPrefs } = useSetters();
  return { prefs, setPrefs, prefsLoaded: hydrated };
}

export function useHydrated(): boolean {
  return useValue().hydrated;
}

export function useNow(): Date {
  return useValue().now;
}

export function useView(): [View, (view: View) => void] {
  const view = useValue().session.view;
  const { setView } = useSetters();
  return [view, setView];
}

export function useCollapsedDates(): {
  collapsedDates: Set<string>;
  toggleCollapsed: (date: string) => void;
} {
  const collapsedDates = useValue().session.collapsedDates;
  const { toggleCollapsed } = useSetters();
  return { collapsedDates, toggleCollapsed };
}

export function useDismissedHeroKeys(): {
  dismissedHeroKeys: Set<string>;
  dismissHero: (key: string) => void;
} {
  const dismissedHeroKeys = useValue().session.dismissedHeroKeys;
  const { dismissHero } = useSetters();
  return { dismissedHeroKeys, dismissHero };
}

export function useLayoutPref(): [Layout, (layout: Layout) => void] {
  const { prefs } = usePreferences();
  const { setPrefs } = useSetters();
  const setLayout = useCallback(
    (next: Layout) =>
      setPrefs((p) => ({ ...p, display: { ...p.display, layout: next } })),
    [setPrefs]
  );
  return [prefs.display.layout ?? "list", setLayout];
}

export function useStarred(eventKey: string): {
  starred: boolean;
  toggle: () => void;
} {
  const { prefs } = usePreferences();
  const { setPrefs } = useSetters();
  const starred = prefs.eventPrefs[eventKey]?.favorite ?? false;
  const toggle = useCallback(
    () =>
      setPrefs((prev) => ({
        ...prev,
        eventPrefs: {
          ...prev.eventPrefs,
          [eventKey]: {
            ...prev.eventPrefs[eventKey],
            favorite: !(prev.eventPrefs[eventKey]?.favorite ?? false),
          },
        },
      })),
    [eventKey, setPrefs]
  );
  return { starred, toggle };
}

export function useSetNow(): (now: Date) => void {
  return useSetters().setNow;
}
