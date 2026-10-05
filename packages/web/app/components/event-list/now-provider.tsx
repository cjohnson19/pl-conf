"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

const NowContext = createContext<Date | undefined>(undefined);

// The live clock for countdowns: starts at the server's render instant so
// hydration matches, then ticks on each minute boundary.
export function NowProvider({
  initialMs,
  children,
}: {
  initialMs: number;
  children: ReactNode;
}) {
  const [now, setNow] = useState(() => new Date(initialMs));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = new Date();
      setNow(current);
      timer = setTimeout(tick, 60_000 - (current.getTime() % 60_000));
    };
    tick();
    return () => clearTimeout(timer);
  }, []);
  return <NowContext.Provider value={now}>{children}</NowContext.Provider>;
}

export function useNow(): Date {
  const value = useContext(NowContext);
  if (value === undefined) {
    throw new Error("useNow must be used inside a <NowProvider>");
  }
  return value;
}
