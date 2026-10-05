"use client";

import { useSyncExternalStore } from "react";

// One shared store per sessionStorage key, so every component reading the
// same key sees the same set: with per-instance state, collapsing group A and
// then group B saved only B.
type Store = { value: ReadonlySet<string>; listeners: Set<() => void> };

const EMPTY: ReadonlySet<string> = new Set();
const stores = new Map<string, Store>();

function read(key: string): ReadonlySet<string> {
  try {
    const stored = sessionStorage.getItem(key);
    return stored === null ? EMPTY : new Set(JSON.parse(stored) as string[]);
  } catch {
    return EMPTY;
  }
}

function store(key: string): Store {
  let s = stores.get(key);
  if (!s) {
    s = { value: read(key), listeners: new Set() };
    stores.set(key, s);
  }
  return s;
}

export function useSessionStorageStringSet(
  key: string
): [
  ReadonlySet<string>,
  (update: (prev: ReadonlySet<string>) => ReadonlySet<string>) => void,
] {
  const value = useSyncExternalStore(
    (listener) => {
      const s = store(key);
      s.listeners.add(listener);
      return () => {
        s.listeners.delete(listener);
      };
    },
    () => store(key).value,
    () => EMPTY
  );
  const set = (update: (prev: ReadonlySet<string>) => ReadonlySet<string>) => {
    const s = store(key);
    s.value = update(s.value);
    try {
      sessionStorage.setItem(key, JSON.stringify([...s.value]));
    } catch {}
    s.listeners.forEach((listener) => {
      listener();
    });
  };
  return [value, set];
}
