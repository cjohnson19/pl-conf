"use client";

import { eventKey, ScheduledEvent } from "../lib/event";
import { EventCard } from "./event-card";
import { Skeleton } from "./ui/skeleton";
import { useEffect, useState } from "react";
import clsx from "clsx";
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
import { OpenSubmissionFilter } from "./open-submission-filter";
import { sorters } from "@/lib/event-sorter";
import { PreferencesProvider, usePreferences } from "./preferences-provider";
import { DisplaySettings } from "./display-settings";
import { Button } from "./ui/button";
import { X } from "lucide-react";

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
  const [filtersSynced, setFiltersSynced] = useState(false);

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
    setFiltersSynced(true);
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

  const hasActiveFilters =
    prefs.filters.selectedYear !== "Any" ||
    prefs.filters.selectedCategory !== "Any" ||
    prefs.filters.openSubmissionFilter !== "All";

  const clearFilters = () => {
    setYearFilter(() => () => true);
    setCategoryFilter(() => () => true);
    setOpenSubmissionFilter(() => () => true);
    setPrefs((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        selectedYear: "Any",
        selectedCategory: "Any",
        openSubmissionFilter: "All",
      },
    }));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
        <div className="sm:max-w-sm sm:flex-1">
          <SearchInput value={textFilter} setValue={setTextFilter} />
        </div>
        <div className="flex flex-wrap gap-2 sm:ml-auto sm:items-center">
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
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              aria-label="Clear all filters"
            >
              <X />
              <span className="hidden md:inline">Clear</span>
            </Button>
          )}
          <DisplaySettings prefs={prefs} setPrefs={setPrefs} />
        </div>
      </div>
      <div className="relative">
        <div
          className={clsx(
            "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full items-start",
            !filtersSynced && "invisible"
          )}
          aria-hidden={!filtersSynced}
        >
          {displayEvents.map((e: ScheduledEvent) => (
            <EventCard key={e.abbreviation} e={e} />
          ))}
        </div>
        {!filtersSynced && (
          <div
            className="absolute inset-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full items-start"
            aria-label="Loading events"
          >
            {Array.from({ length: 9 }, (_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        )}
      </div>
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
