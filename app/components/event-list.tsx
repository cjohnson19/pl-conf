"use client";
import { EventType, ScheduledEvent } from "../lib/event";
import { EventCard } from "./event-card";
import { useState } from "react";
import { CategoryFilter } from "./category-filter";
import { hasText, isBetween, isType } from "../lib/event-filter";
import { SearchInput } from "./search-input";
import { DateFilter } from "./date-filter";
import { Accordion, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { format } from "date-fns";
import { AccordionContent } from "@radix-ui/react-accordion";

export function EventList({ events }: { events: string }) {
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [textFilter, setTextFilter] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<string | undefined>();

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
      <div className="flex flex-col gap-8 px-11 items-center">
        <div className="flex flex-col gap-2 w-full">
          <SearchInput value={textFilter} setValue={setTextFilter} />
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger> Filters </AccordionTrigger>
              <AccordionContent className="flex flex-col w-full items-start gap-2 mb-4 md:flex-row md:items-center">
                <DateFilter
                  value={yearFilter}
                  setValue={setYearFilter}
                  years={eventYears}
                />
                <CategoryFilter
                  value={categoryFilter}
                  setValue={setCategoryFilter}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        {es
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
          )
          .map((e: ScheduledEvent) => (
            <EventCard key={e.abbreviation} e={e} />
          ))}
      </div>
    </>
  );
}
