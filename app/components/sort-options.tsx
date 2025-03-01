"use client";
import {
  EventSorter,
  sortByEventDate,
  sortByFirstDeadline,
} from "@/lib/event-sorter";
import { Dispatch, SetStateAction, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { ArrowDownUp } from "lucide-react";

export function SortOptions({
  setValue,
}: {
  setValue: Dispatch<SetStateAction<EventSorter>>;
}) {
  const [s, sv] = useState<string>("one");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={"outline"}>
          <ArrowDownUp /> Sort by
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={s}>
          <DropdownMenuRadioItem
            value="one"
            onClick={() => {
              sv(() => "one");
              setValue(() => sortByEventDate);
            }}
          >
            Event date
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value="two"
            onClick={() => {
              sv(() => "two");
              setValue(() => sortByFirstDeadline);
            }}
          >
            Earliest Deadline
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
