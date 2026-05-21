"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useMemo,
} from "react";
import {
  defaultPreferences,
  type PreferenceCollection,
} from "@/lib/user-prefs";
import { useLocalStorage } from "@/hooks/use-local-storage";

type PreferencesContextType = {
  prefs: PreferenceCollection;
  setPrefs: Dispatch<SetStateAction<PreferenceCollection>>;
  prefsLoaded: boolean;
};

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs, prefsLoaded] = useLocalStorage<PreferenceCollection>(
    "userPrefsV2",
    defaultPreferences
  );

  const value = useMemo(
    () => ({ prefs, setPrefs, prefsLoaded }),
    [prefs, setPrefs, prefsLoaded]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}
