"use client";

import { createContext, type ReactNode, useContext } from "react";
import { useNowTick } from "../../hooks/use-now-tick";

const NowContext = createContext<Date | null>(null);

export function NowProvider({
  initialMs,
  children,
}: {
  initialMs: number;
  children: ReactNode;
}) {
  const now = useNowTick(initialMs);
  return <NowContext.Provider value={now}>{children}</NowContext.Provider>;
}

export function useNow(): Date {
  const value = useContext(NowContext);
  if (value === null) {
    throw new Error("useNow must be used inside a <NowProvider>");
  }
  return value;
}
