"use client";

import { EventFilter, openToNewSubmissions } from "@/lib/event-filter";
import { Dispatch, SetStateAction } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { DoorOpen } from "lucide-react";
import { FilterPreferences } from "@/lib/user-prefs";

export function OpenSubmissionFilter({
  setValue,
  value,
  onValueChange,
}: {
  setValue: Dispatch<SetStateAction<EventFilter>>;
  value: FilterPreferences["openSubmissionFilter"];
  onValueChange: (value: FilterPreferences["openSubmissionFilter"]) => void;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant={"outline"}>
          <DoorOpen />{" "}
          <span className="hidden md:inline">Open to submissions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={value}>
          <DropdownMenuRadioItem
            value={"All"}
            onClick={() => {
              setValue(() => openToNewSubmissions(false));
              onValueChange("All");
            }}
          >
            All events
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value={"Filter"}
            onClick={() => {
              setValue(() => openToNewSubmissions(true));
              onValueChange("Filter");
            }}
          >
            Only those open to new submissions
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
