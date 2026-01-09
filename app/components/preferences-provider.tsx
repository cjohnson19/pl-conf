"use client";

import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
} from "react";
import { defaultPreferences, PreferenceCollection } from "@/lib/user-prefs";
import { useLocalStorage } from "@/hooks/use-local-storage";

type PreferencesContextType = {
  prefs: PreferenceCollection;
  setPrefs: Dispatch<SetStateAction<PreferenceCollection>>;
  prefsLoaded: boolean;
};

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const didMount = useRef(false);
  const [prefs, setPrefs, prefsLoaded] = useLocalStorage<PreferenceCollection>(
    "userPrefsV2",
    defaultPreferences
  );

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (prefsLoaded) {
      window.localStorage.setItem("userPrefsV2", JSON.stringify(prefs));
    }
  }, [prefs, prefsLoaded]);

  return (
    <PreferencesContext.Provider value={{ prefs, setPrefs, prefsLoaded }}>
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
