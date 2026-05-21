"use client";

import { useStarred } from "../components/preferences-provider";

export function useFavorite(prefKey: string): {
  on: boolean;
  toggle: () => void;
} {
  const { starred, toggle } = useStarred(prefKey);
  return { on: starred, toggle };
}
