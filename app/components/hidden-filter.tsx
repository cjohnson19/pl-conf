"use client";
import { Dispatch, SetStateAction, useState } from "react";
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
import { PreferenceCollection } from "@/lib/user-prefs";

export function HiddenFilter({
  setValue,
  userPrefs,
}: {
  setValue: Dispatch<SetStateAction<EventFilter>>;
  userPrefs: PreferenceCollection;
}) {
  const [strValue, setStrValue] = useState<string>("visible");
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant={"outline"}>
          <EyeIcon /> <span className="hidden md:inline">Hidden Items</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={strValue}>
          <DropdownMenuRadioItem
            value={"visible"}
            onClick={() => {
              setStrValue("visible");
              setValue(() => hiddenFilter(userPrefs.eventPrefs)("visible"));
            }}
          >
            Do not show hidden
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value={"hidden"}
            onClick={() => {
              setValue(() => hiddenFilter(userPrefs.eventPrefs)("hidden"));
              setStrValue("hidden");
            }}
          >
            Show only hidden
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value={"all"}
            onClick={() => {
              setStrValue("all");
              setValue(() => hiddenFilter(userPrefs.eventPrefs)("all"));
            }}
          >
            Show all
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
