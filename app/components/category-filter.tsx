"use client";
import { EventFilter, isCategory } from "@/lib/event-filter";
import { Dispatch, SetStateAction } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { eventTypes } from "@/lib/event";
import { capitalize } from "@/lib/utils";
import { FilterIcon } from "lucide-react";
import { FilterPreferences } from "@/lib/user-prefs";

export function CategoryFilter({
  setValue,
  value,
  onValueChange,
}: {
  setValue: Dispatch<SetStateAction<EventFilter>>;
  value: FilterPreferences["selectedCategory"];
  onValueChange: (value: FilterPreferences["selectedCategory"]) => void;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant={"outline"} aria-label="Filter by event's category">
          <FilterIcon /> <span className="hidden md:inline">Category</span>
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
          {eventTypes.map((l, i) => (
            <DropdownMenuRadioItem
              key={i}
              value={l}
              onClick={() => {
                setValue(() => isCategory(l));
                onValueChange(l);
              }}
            >
              {capitalize(l)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  // <ToggleGroup
  //   variant="outline"
  //   type="single"
  //   value={strValue}
  //   onValueChange={(v) => {
  //     setStrValue(v);
  //     setValue(() => isCategory(v));
  //   }}
  //   asChild
  // >
  //   <ToggleGroupItem value="conference">Conference</ToggleGroupItem>
  //   <ToggleGroupItem value="workshop">Workshop</ToggleGroupItem>
  //   <ToggleGroupItem value="symposium">Symposium</ToggleGroupItem>
  // </ToggleGroup>
}
