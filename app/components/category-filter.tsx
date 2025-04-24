"use client";
import { EventFilter, isCategory } from "@/lib/event-filter";
import { Dispatch, SetStateAction, useState } from "react";
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

export function CategoryFilter({
  setValue,
}: {
  setValue: Dispatch<SetStateAction<EventFilter>>;
}) {
  const [strValue, setStrValue] = useState<string>("Any");
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant={"outline"}>
          <FilterIcon /> <span className="hidden md:inline">Category</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={strValue}>
          <DropdownMenuRadioItem
            value={"Any"}
            onClick={() => {
              setStrValue("Any");
              setValue(() => () => true);
            }}
          >
            Any
          </DropdownMenuRadioItem>
          {eventTypes.map((l, i) => (
            <DropdownMenuRadioItem
              key={i}
              value={l}
              onClick={() => {
                setStrValue(l);
                setValue(() => isCategory(l));
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
