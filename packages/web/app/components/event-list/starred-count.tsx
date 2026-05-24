"use client";

import { useMemo } from "react";
import { type ScheduledEvent, eventKey } from "../../lib/event";
import { usePreferences } from "../preferences-provider";

export function StarredCount({
  displayEvents,
}: {
  displayEvents: ScheduledEvent[];
}) {
  const { prefs, prefsLoaded } = usePreferences();
  const count = useMemo(() => {
    if (!prefsLoaded) return null;
    const starred = new Set(
      Object.entries(prefs.eventPrefs)
        .filter(([, v]) => v?.favorite)
        .map(([k]) => k)
    );
    return displayEvents.filter((e) => starred.has(eventKey(e))).length;
  }, [prefs, prefsLoaded, displayEvents]);
  if (count === null) return null;
  return <>{count}</>;
}
