import { useState, useEffect, useCallback, useRef } from "react";

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

export function useLocalStorage<T extends Record<string, unknown>>(
  key: string,
  initialValue: T
) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);
  const initialValueRef = useRef(initialValue);

  useEffect(() => {
    try {
      const item = window?.localStorage.getItem(key);
      if (item) {
        const loadedValue = JSON.parse(item);
        setStoredValue(mergeDeep(initialValueRef.current, loadedValue));
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    } finally {
      setIsLoaded(true);
    }
  }, [key]);

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
