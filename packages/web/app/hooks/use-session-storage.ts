import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

export function useSessionStorageStringSet(
  key: string,
  initial: Set<string>
): [Set<string>, Dispatch<SetStateAction<Set<string>>>] {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(key);
      if (stored !== null) setValue(new Set(JSON.parse(stored) as string[]));
    } catch {}
  }, [key]);

  const set: Dispatch<SetStateAction<Set<string>>> = useCallback(
    (v) => {
      setValue((prev) => {
        const next = typeof v === "function" ? v(prev) : v;
        try {
          window.sessionStorage.setItem(key, JSON.stringify([...next]));
        } catch {}
        return next;
      });
    },
    [key]
  );

  return [value, set];
}
