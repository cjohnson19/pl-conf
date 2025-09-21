"use client";
import { ScheduledEvent } from "../lib/event";
import { EventCard } from "./event-card";
import { useEffect, useRef, useState } from "react";
import { CategoryFilter } from "./category-filter";
import {
  applyFilters,
  EventFilter,
  hasYear,
  hiddenFilter,
  isActive,
  isCategory,
  openToNewSubmissions,
} from "../lib/event-filter";
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
  const didMount = useRef(false);
  const [userPrefs, setUserPrefs, prefsLoaded] =
    useLocalStorage<PreferenceCollection>("userPrefsV2", defaultPreferences);
  const [categoryFilter, setCategoryFilter] = useState<EventFilter>(
    () => () => true
  );
  const [textFilter, setTextFilter] = useState<EventFilter>(() => () => true);
  const [yearFilter, setYearFilter] = useState<EventFilter>(() => () => true);
  const [openSubmissionFilter, setOpenSubmissionFilter] = useState<EventFilter>(
    () => () => true
  );
  const [showHiddenFilter, setShowHiddenFilter] = useState<EventFilter>(
    () => () => true
  );
  // const [showHidden, setShowHidden] = useState<boolean>(false);
  function filterEvents(es: ScheduledEvent[]): ScheduledEvent[] {
    return applyFilters(es, [
      isActive,
      showHiddenFilter,
      categoryFilter,
      textFilter,
      yearFilter,
      openSubmissionFilter,
    ]);
  }

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (prefsLoaded) {
      window.localStorage.setItem("userPrefsV2", JSON.stringify(userPrefs));
    }
  }, [userPrefs, prefsLoaded]);

  useEffect(() => {
    if (!prefsLoaded) {
      return;
    }
    const selectedCategory = userPrefs.filters.selectedCategory;
    setCategoryFilter(() =>
      selectedCategory === "Any" ? () => true : isCategory(selectedCategory)
    );

    const selectedYear = userPrefs.filters.selectedYear;
    setYearFilter(() =>
      selectedYear === "Any" ? () => true : hasYear(selectedYear)
    );

    setOpenSubmissionFilter(() =>
      openToNewSubmissions(userPrefs.filters.openSubmissionFilter === "Filter")
    );
    setShowHiddenFilter(() =>
      hiddenFilter(userPrefs.eventPrefs)(userPrefs.filters.hiddenItemsFilter)
    );
  }, [userPrefs, prefsLoaded]);

  const es = JSON.parse(events) as ScheduledEvent[];
  const eventYears = [
    ...new Set(
      es
        .filter((e) => e.date.start !== "TBD")
        .map((e) => format(e.date.start, "yyyy"))
    ),
  ];

  return (
    <div className="flex flex-col gap-8 px-4 md:px-11 items-center">
      <div className="flex flex-col gap-2 w-full">
        <SearchInput value={textFilter} setValue={setTextFilter} />
        <div className="flex flex-row flex-wrap w-full justify-around gap-2 mb-4 md:items-center">
          <DateFilter
            setValue={setYearFilter}
            years={eventYears}
            value={userPrefs.filters.selectedYear}
            onValueChange={(value) =>
              setUserPrefs((prev) => ({
                ...prev,
                filters: { ...prev.filters, selectedYear: value },
              }))
            }
          />
          <CategoryFilter
            setValue={setCategoryFilter}
            value={userPrefs.filters.selectedCategory}
            onValueChange={(value) =>
              setUserPrefs((prev) => ({
                ...prev,
                filters: { ...prev.filters, selectedCategory: value },
              }))
            }
          />
          <HiddenFilter
            setValue={setShowHiddenFilter}
            value={userPrefs.filters.hiddenItemsFilter}
            onValueChange={(value) =>
              setUserPrefs((prev) => ({
                ...prev,
                filters: { ...prev.filters, hiddenItemsFilter: value },
              }))
            }
            eventPrefs={userPrefs.eventPrefs}
          />
          <SortOptions userPrefs={userPrefs} setUserPrefs={setUserPrefs} />
          <OpenSubmissionFilter
            setValue={setOpenSubmissionFilter}
            value={userPrefs.filters.openSubmissionFilter}
            onValueChange={(value) =>
              setUserPrefs((prev) => ({
                ...prev,
                filters: { ...prev.filters, openSubmissionFilter: value },
              }))
            }
          />
        </div>
      </div>
      {!prefsLoaded
        ? Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl"></Skeleton>
          ))
        : filterEvents(es)
            .sort((a, b) =>
              sorters.find(({ key }) => key === userPrefs.sortBy)!.f(a, b)
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
