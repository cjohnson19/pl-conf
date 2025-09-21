"use client";
import { Dispatch, SetStateAction } from "react";
import { EyeIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { EventFilter, hiddenFilter } from "@/lib/event-filter";
import { FilterPreferences, PreferenceCollection } from "@/lib/user-prefs";

export function HiddenFilter({
  setValue,
  value,
  onValueChange,
  eventPrefs,
}: {
  setValue: Dispatch<SetStateAction<EventFilter>>;
  value: FilterPreferences["hiddenItemsFilter"];
  onValueChange: (value: FilterPreferences["hiddenItemsFilter"]) => void;
  eventPrefs: PreferenceCollection["eventPrefs"];
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant={"outline"}>
          <EyeIcon /> <span className="hidden md:inline">Hidden Items</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={value}>
          <DropdownMenuRadioItem
            value={"visible"}
            onClick={() => {
              setValue(() => hiddenFilter(eventPrefs)("visible"));
              onValueChange("visible");
            }}
          >
            Do not show hidden
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value={"hidden"}
            onClick={() => {
              setValue(() => hiddenFilter(eventPrefs)("hidden"));
              onValueChange("hidden");
            }}
          >
            Show only hidden
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value={"all"}
            onClick={() => {
              setValue(() => hiddenFilter(eventPrefs)("all"));
              onValueChange("all");
            }}
          >
            Show all
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
