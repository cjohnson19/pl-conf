"use client";
import { ScheduledEvent } from "../lib/event";
import { EventCard } from "./event-card";
import { useEffect, useRef, useState } from "react";
import { CategoryFilter } from "./category-filter";
import { applyFilters, EventFilter } from "../lib/event-filter";
import { SearchInput } from "./search-input";
import { DateFilter } from "./date-filter";
import { format } from "date-fns";
import {
  defaultPreferences,
  eventKey,
  PreferenceCollection,
} from "@/lib/user-prefs";
import { HiddenFilter } from "./hidden-filter";
import { Skeleton } from "./ui/skeleton";
import { OpenSubmissionFilter } from "./open-submission-filter";
import { sorters } from "@/lib/event-sorter";
import { SortOptions } from "./sort-options";
import { useLocalStorage } from "@/hooks/use-local-storage";

export function EventList({ events }: { events: string }) {
  const [categoryFilter, setCategoryFilter] = useState<EventFilter>(
    () => () => true,
  );
  const [textFilter, setTextFilter] = useState<EventFilter>(() => () => true);
  const [yearFilter, setYearFilter] = useState<EventFilter>(() => () => true);
  const [openSubmissionFilter, setOpenSubmissionFilter] = useState<EventFilter>(
    () => () => true,
  );
  const [showHidden, setShowHidden] = useState<boolean>(false);
  function filterEvents(es: ScheduledEvent[]): ScheduledEvent[] {
    return applyFilters(
      es.filter(
        (e) =>
          showHidden ||
          userPrefs.eventPrefs[eventKey(e)]?.hidden === undefined ||
          userPrefs.eventPrefs[eventKey(e)].hidden === false,
      ),
      [categoryFilter, textFilter, yearFilter, openSubmissionFilter],
    );
  }
  const didMount = useRef(false);
  const [userPrefs, setUserPrefs, prefsLoaded] =
    useLocalStorage<PreferenceCollection>("userPrefsV2", defaultPreferences);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (prefsLoaded) {
      window.localStorage.setItem("userPrefsV2", JSON.stringify(userPrefs));
    }
  }, [userPrefs, prefsLoaded]);

  const es = JSON.parse(events) as ScheduledEvent[];
  const eventYears = [
    ...new Set(
      es
        .filter((e) => e.date.start !== "TBD")
        .map((e) => format(e.date.start, "yyyy")),
    ),
  ];

  return (
    <div className="flex flex-col gap-8 px-4 md:px-11 items-center">
      <div className="flex flex-col gap-2 w-full">
        <SearchInput value={textFilter} setValue={setTextFilter} />
        <div className="flex flex-row flex-wrap w-full justify-start gap-2 mb-4 md:items-center">
          <DateFilter setValue={setYearFilter} years={eventYears} />
          <CategoryFilter setValue={setCategoryFilter} />
          <HiddenFilter value={showHidden} setValue={setShowHidden} />
          <SortOptions userPrefs={userPrefs} setUserPrefs={setUserPrefs} />
          <OpenSubmissionFilter setValue={setOpenSubmissionFilter} />
        </div>
      </div>
      {!prefsLoaded
        ? Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl"></Skeleton>
          ))
        : filterEvents(es)
            .sort((a, b) =>
              sorters.find(({ key }) => key === userPrefs.sortBy)!.f(a, b),
            )
            .sort((a, b) => {
              return userPrefs.eventPrefs[eventKey(a)]?.favorite
                ? -1
                : userPrefs.eventPrefs[eventKey(b)]?.favorite
                ? 1
                : 0;
            })
            .map((e: ScheduledEvent) => (
              <EventCard
                key={e.abbreviation}
                e={e}
                prefs={userPrefs}
                setPrefs={setUserPrefs}
              />
            ))}
    </div>
  );
}
