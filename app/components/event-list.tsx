"use client";
import { ScheduledEvent } from "../lib/event";
import { EventCard } from "./event-card";
import { useEffect, useRef, useState } from "react";
import { CategoryFilter } from "./category-filter";
import { applyFilters, EventFilter } from "../lib/event-filter";
import { SearchInput } from "./search-input";
import { DateFilter } from "./date-filter";
import { format } from "date-fns";
import { PreferenceCollection } from "@/lib/event-prefs";
import { HiddenFilter } from "./hidden-filter";
import { Skeleton } from "./ui/skeleton";
import { OpenSubmissionFilter } from "./open-submission-filter";
import { EventSorter, sortByEventDate } from "@/lib/event-sorter";
import { SortOptions } from "./sort-options";

export function EventList({ events }: { events: string }) {
  const [prefsLoaded, setPrefsLoaded] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<EventFilter>(
    () => () => true,
  );
  const [textFilter, setTextFilter] = useState<EventFilter>(() => () => true);
  const [yearFilter, setYearFilter] = useState<EventFilter>(() => () => true);
  const [openSubmissionFilter, setOpenSubmissionFilter] = useState<EventFilter>(
    () => () => true,
  );
  const [showHidden, setShowHidden] = useState<boolean>(false);
  const [userPrefs, setUserPrefs] = useState<PreferenceCollection>({});
  const [sorter, setSorter] = useState<EventSorter>(() => sortByEventDate);

  function filterEvents(es: ScheduledEvent[]): ScheduledEvent[] {
    return applyFilters(
      es.filter(
        (e) =>
          showHidden ||
          userPrefs[e.name]?.hidden === undefined ||
          userPrefs[e.name].hidden === false,
      ),
      [categoryFilter, textFilter, yearFilter, openSubmissionFilter],
    );
  }
  const didMount = useRef(false);

  useEffect(() => {
    const storedPrefs = JSON.parse(
      window.localStorage.getItem("userPrefs") ?? "{}",
    );
    setUserPrefs(storedPrefs);
    setPrefsLoaded(true);
  }, []);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (prefsLoaded) {
      window.localStorage.setItem("userPrefs", JSON.stringify(userPrefs));
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
    <>
      <div className="flex flex-col gap-8 px-4 md:px-11 items-center">
        <div className="flex flex-col gap-2 w-full">
          <SearchInput value={textFilter} setValue={setTextFilter} />
          <div className="flex flex-col w-full items-start justify-between gap-2 mb-4 md:flex-row md:items-center">
            <DateFilter setValue={setYearFilter} years={eventYears} />
            <CategoryFilter setValue={setCategoryFilter} />
            <OpenSubmissionFilter setValue={setOpenSubmissionFilter} />
            <HiddenFilter value={showHidden} setValue={setShowHidden} />
            <SortOptions setValue={setSorter} />
          </div>
        </div>
        {!prefsLoaded
          ? Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-2xl"></Skeleton>
            ))
          : filterEvents(es)
              .sort((a, b) => sorter(a, b))
              .sort((a, b) => {
                return userPrefs[a.name]?.favorite
                  ? -1
                  : userPrefs[b.name]?.favorite
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
    </>
  );
}
