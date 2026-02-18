"use client";

import { ScheduledEvent } from "../lib/event";
import { EventCard } from "./event-card";
import { Skeleton } from "./ui/skeleton";
import { useEffect, useState } from "react";
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
import { HiddenFilter } from "./hidden-filter";
import { OpenSubmissionFilter } from "./open-submission-filter";
import { sorters } from "@/lib/event-sorter";
import { SortOptions } from "./sort-options";
import { PreferencesProvider, usePreferences } from "./preferences-provider";
import { eventKey } from "@/lib/user-prefs";

function EventListInner({
  events,
  eventYears,
}: {
  events: ScheduledEvent[];
  eventYears: string[];
}) {
  const { prefs, setPrefs, prefsLoaded } = usePreferences();

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
    if (!prefsLoaded) {
      return;
    }
    const selectedCategory = prefs.filters.selectedCategory;
    setCategoryFilter(() =>
      selectedCategory === "Any" ? () => true : isCategory(selectedCategory)
    );

    const selectedYear = prefs.filters.selectedYear;
    setYearFilter(() =>
      selectedYear === "Any" ? () => true : hasYear(selectedYear)
    );

    setOpenSubmissionFilter(() =>
      openToNewSubmissions(prefs.filters.openSubmissionFilter === "Filter")
    );
    setShowHiddenFilter(() =>
      hiddenFilter(prefs.eventPrefs)(prefs.filters.hiddenItemsFilter)
    );
  }, [prefs, prefsLoaded]);

  // Use pre-filtered events from server, apply additional client-side filters
  const displayEvents = filterEvents(events)
    .sort((a, b) => sorters.find(({ key }) => key === prefs.sortBy)!.f(a, b))
    .sort((a, b) => {
      return prefs.eventPrefs[eventKey(a)]?.favorite
        ? -1
        : prefs.eventPrefs[eventKey(b)]?.favorite
          ? 1
          : 0;
    });

  return (
    <div className="flex flex-col gap-8 px-4 md:px-11 items-center">
      <div className="flex flex-col gap-2 w-full">
        <SearchInput value={textFilter} setValue={setTextFilter} />
        <div className="flex flex-row flex-wrap w-full justify-around gap-2 mb-4 md:items-center">
          <DateFilter
            setValue={setYearFilter}
            years={eventYears}
            value={prefs.filters.selectedYear}
            onValueChange={(value) =>
              setPrefs((prev) => ({
                ...prev,
                filters: { ...prev.filters, selectedYear: value },
              }))
            }
          />
          <CategoryFilter
            setValue={setCategoryFilter}
            value={prefs.filters.selectedCategory}
            onValueChange={(value) =>
              setPrefs((prev) => ({
                ...prev,
                filters: { ...prev.filters, selectedCategory: value },
              }))
            }
          />
          <HiddenFilter
            setValue={setShowHiddenFilter}
            value={prefs.filters.hiddenItemsFilter}
            onValueChange={(value) =>
              setPrefs((prev) => ({
                ...prev,
                filters: { ...prev.filters, hiddenItemsFilter: value },
              }))
            }
            eventPrefs={prefs.eventPrefs}
          />
          <SortOptions userPrefs={prefs} setUserPrefs={setPrefs} />
          <OpenSubmissionFilter
            setValue={setOpenSubmissionFilter}
            value={prefs.filters.openSubmissionFilter}
            onValueChange={(value) =>
              setPrefs((prev) => ({
                ...prev,
                filters: { ...prev.filters, openSubmissionFilter: value },
              }))
            }
          />
        </div>
      </div>
      {!prefsLoaded
        ? Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))
        : displayEvents.map((e: ScheduledEvent) => (
            <EventCard key={e.abbreviation} e={e} />
          ))}
    </div>
  );
}

export function EventListContainer({
  events,
  eventYears,
}: {
  events: ScheduledEvent[];
  eventYears: string[];
}) {
  return (
    <PreferencesProvider>
      <EventListInner events={events} eventYears={eventYears} />
    </PreferencesProvider>
  );
}
