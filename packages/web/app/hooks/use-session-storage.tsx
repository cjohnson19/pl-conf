import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

export type Codec<T> = {
  parse: (raw: string) => T;
  serialize: (value: T) => string;
};

export const stringCodec: Codec<string> = {
  parse: (raw) => raw,
  serialize: (value) => value,
};

export const stringSetCodec: Codec<Set<string>> = {
  parse: (raw) => new Set(JSON.parse(raw) as string[]),
  serialize: (value) => JSON.stringify([...value]),
};

export function useSessionStorage<T>(
  key: string,
  initial: T,
  codec: Codec<T>
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(key);
      if (stored !== null) setValue(codec.parse(stored));
    } catch {}
    setLoaded(true);
  }, [key, codec]);

  const set: Dispatch<SetStateAction<T>> = useCallback(
    (v) => {
      setValue((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try {
          window.sessionStorage.setItem(key, codec.serialize(next));
        } catch {}
        return next;
      });
    },
    [key, codec]
  );

  return [value, set, loaded];
}
