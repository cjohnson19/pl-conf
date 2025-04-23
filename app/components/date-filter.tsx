"use client";
import { EventFilter, hasYear } from "@/lib/event-filter";
import { Dispatch, SetStateAction, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { CalendarRangeIcon } from "lucide-react";

export function DateFilter({
  setValue,
  years,
}: {
  setValue: Dispatch<SetStateAction<EventFilter>>;
  years: string[];
}) {
  const [strValue, setStrValue] = useState<string>("");
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
        <DropdownMenuRadioGroup value={strValue}>
          {years.map((l, i) => (
            <DropdownMenuRadioItem
              key={i}
              value={l}
              onClick={() => {
                setStrValue(l);
                setValue(() => hasYear(l));
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
