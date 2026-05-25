"use client";

import clsx from "clsx";
import { eventKey } from "../../lib/event";
import type { DisplayEvent } from "../../lib/event-list-view";
import { EventCard } from "../event-card";
import { usePreferences } from "../preferences-provider";

export function LayoutSwitcher({
  events,
  serverNowMs,
  listChildren,
}: {
  events: DisplayEvent[];
  serverNowMs: number;
  listChildren: React.ReactNode;
}) {
  const { prefs, prefsLoaded } = usePreferences();
  const layout = prefs.display.layout ?? "list";
  if (prefsLoaded && layout === "grid") {
    if (events.length === 0) {
      return (
        <div className="px-5 py-8 text-[13px] text-ink-3 md:px-8">
          No events match these filters.
        </div>
      );
    }
    return (
      <div
        className={clsx(
          "mt-4 grid grid-cols-1 gap-3 px-5 md:grid-cols-2 md:px-8 xl:grid-cols-3"
        )}
      >
        {events.map((e) => (
          <EventCard key={eventKey(e)} event={e} now={new Date(serverNowMs)} />
        ))}
      </div>
    );
  }
  return <>{listChildren}</>;
}
