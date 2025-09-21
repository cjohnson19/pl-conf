"use client";
import { EventFilter, hasYear } from "@/lib/event-filter";
import { Dispatch, SetStateAction } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { CalendarRangeIcon } from "lucide-react";
import { FilterPreferences } from "@/lib/user-prefs";

export function DateFilter({
  setValue,
  years,
  value,
  onValueChange,
}: {
  setValue: Dispatch<SetStateAction<EventFilter>>;
  years: string[];
  value: FilterPreferences["selectedYear"];
  onValueChange: (value: FilterPreferences["selectedYear"]) => void;
}) {
  return years.length <= 1 ? (
    <></>
  ) : (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant={"outline"}>
          <CalendarRangeIcon /> <span className="hidden md:inline">Year</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={value}>
          <DropdownMenuRadioItem
            value={"Any"}
            onClick={() => {
              setValue(() => () => true);
              onValueChange("Any");
            }}
          >
            Any
          </DropdownMenuRadioItem>
          {years.map((l, i) => (
            <DropdownMenuRadioItem
              key={i}
              value={l}
              onClick={() => {
                setValue(() => hasYear(l));
                onValueChange(l);
              }}
            >
              {l}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
