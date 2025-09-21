import { useState, useEffect, useCallback } from "react";

// Deep merge function to combine loaded value with initial value
function deepMerge<T extends Record<string, unknown>>(
  initial: T,
  loaded: unknown
): T {
  if (!loaded || typeof loaded !== "object" || loaded === null) {
    return initial;
  }

  const loadedObj = loaded as Record<string, unknown>;
  const result = { ...initial };

  for (const key in initial) {
    if (loadedObj[key] !== undefined) {
      if (
        typeof initial[key] === "object" &&
        initial[key] !== null &&
        !Array.isArray(initial[key])
      ) {
        result[key] = deepMerge(
          initial[key] as Record<string, unknown>,
          loadedObj[key]
        ) as T[Extract<keyof T, string>];
      } else {
        result[key] = loadedObj[key] as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

export function useLocalStorage<T extends Record<string, unknown>>(
  key: string,
  initialValue: T
) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const item = window?.localStorage.getItem(key);
      if (item) {
        const loadedValue = JSON.parse(item);
        const mergedValue = deepMerge(initialValue, loadedValue) as T;
        setStoredValue(mergedValue);
      } else {
        setStoredValue(initialValue);
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      setStoredValue(initialValue);
    } finally {
      setIsLoaded(true);
    }
  }, [key, initialValue]);

  // Update localStorage when state changes
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue, isLoaded] as const;
}
