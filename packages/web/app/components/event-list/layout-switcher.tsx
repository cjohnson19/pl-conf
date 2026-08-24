"use client";

import { eventKey } from "../../lib/event";
import type { DisplayEvent } from "../../lib/event-list-view";
import { EventCard } from "../event-card";
import { useDisplayPref, usePrefsLoaded } from "../preferences-provider";
import { NoEventsMessage } from "./view-empty-state";

// Shared with the loading skeleton, which must mirror the real grid layout.
export const cardGridClass =
  "mt-4 grid grid-cols-1 gap-3 px-5 md:grid-cols-2 md:px-8 xl:grid-cols-3";

export function LayoutSwitcher({
  events,
  listChildren,
}: {
  events: DisplayEvent[];
  listChildren: React.ReactNode;
}) {
  const prefsLoaded = usePrefsLoaded();
  const layout = useDisplayPref("layout") ?? "list";
  if (prefsLoaded && layout === "grid") {
    if (events.length === 0) {
      return <NoEventsMessage />;
    }
    return (
      <div className={cardGridClass}>
        {events.map((e) => (
          <EventCard key={eventKey(e)} event={e} />
        ))}
      </div>
    );
  }
  return <>{listChildren}</>;
}
