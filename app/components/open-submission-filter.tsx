"use client";

import { EventFilter, openToNewSubmissions } from "@/lib/event-filter";
import { Dispatch, SetStateAction, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { DoorOpen } from "lucide-react";

export function OpenSubmissionFilter({
  setValue,
}: {
  setValue: Dispatch<SetStateAction<EventFilter>>;
}) {
  const [strValue, setStrValue] = useState<string>("All");
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant={"outline"}>
          <DoorOpen />{" "}
          <span className="hidden md:inline">Open to submissions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={strValue}>
          <DropdownMenuRadioItem
            value={"All"}
            onClick={() => {
              setStrValue("All");
              setValue(() => openToNewSubmissions(false));
            }}
          >
            All events
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value={"Filter"}
            onClick={() => {
              setStrValue("Filter");
              setValue(() => openToNewSubmissions(true));
            }}
          >
            Only those open to new submissions
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
