"use client";

import { useMemo } from "react";
import { eventKey } from "../../lib/event";
import type { DisplayEvent } from "../../lib/event-list-view";
import { useEventPrefs, usePrefsLoaded } from "../preferences-provider";

export function StarredCount({
  displayEvents,
}: {
  displayEvents: DisplayEvent[];
}) {
  const eventPrefs = useEventPrefs();
  const prefsLoaded = usePrefsLoaded();
  const count = useMemo(() => {
    if (!prefsLoaded) return null;
    const starred = new Set(
      Object.entries(eventPrefs)
        .filter(([, v]) => v?.favorite)
        .map(([k]) => k)
    );
    return displayEvents.filter((e) => starred.has(eventKey(e))).length;
  }, [eventPrefs, prefsLoaded, displayEvents]);
  if (count === null) return null;
  return <>{count}</>;
}
