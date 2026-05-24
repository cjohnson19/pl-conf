import { useEffect, useState } from "react";

export function useNowTick(initialMs: number): Date {
  const [now, setNow] = useState(() => new Date(initialMs));
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = new Date();
      setNow(current);
      const msUntilNextMinute = 60_000 - (current.getTime() % 60_000);
      timeoutId = setTimeout(tick, msUntilNextMinute);
    };
    tick();
    return () => clearTimeout(timeoutId);
  }, []);
  return now;
}
