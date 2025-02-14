"use client";
import { EventType, ScheduledEvent } from "../lib/event";
import { EventCard } from "./event-card";
import { useEffect, useRef, useState } from "react";
import { CategoryFilter } from "./category-filter";
import { hasText, isBetween, isType } from "../lib/event-filter";
import { SearchInput } from "./search-input";
import { DateFilter } from "./date-filter";
import { format } from "date-fns";
import { PreferenceCollection } from "@/lib/event-prefs";
import { HiddenFilter } from "./hidden-filter";
import { Skeleton } from "./ui/skeleton";

export function EventList({ events }: { events: string }) {
  const [prefsLoaded, setPrefsLoaded] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [textFilter, setTextFilter] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<string | undefined>();
  const [showHidden, setShowHidden] = useState<boolean>(false);
  const [userPrefs, setUserPrefs] = useState<PreferenceCollection>({});

  function applyFilters(es: ScheduledEvent[]): ScheduledEvent[] {
    return es
      .filter(
        (e) =>
          showHidden ||
          userPrefs[e.name]?.hidden === undefined ||
          userPrefs[e.name].hidden === false,
      )
      .filter(
        (e) =>
          categoryFilter === "" || isType(categoryFilter as EventType).f(e),
      )
      .filter((e) => textFilter === "" || hasText(textFilter).f(e))
      .filter(
        (e) =>
          yearFilter === undefined ||
          isBetween({
            from: new Date(Number(yearFilter), 0, 1),
            to: new Date(Number(yearFilter), 11, 31),
          }).f(e),
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
            <DateFilter
              value={yearFilter}
              setValue={setYearFilter}
              years={eventYears}
            />
            <CategoryFilter
              value={categoryFilter}
              setValue={setCategoryFilter}
            />
            <HiddenFilter value={showHidden} setValue={setShowHidden} />
          </div>
        </div>
        {!prefsLoaded
          ? Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-2xl"></Skeleton>
            ))
          : applyFilters(es)
              .sort((a, b) => {
                return b.date.start === "TBD"
                  ? -1
                  : a.date.start === "TBD"
                  ? 1
                  : a.date.start.localeCompare(b.date.start);
              })
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
