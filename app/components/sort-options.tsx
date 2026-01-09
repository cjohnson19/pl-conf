"use client";
import { sorters } from "@/lib/event-sorter";
import { Dispatch, SetStateAction } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { ArrowDownUp } from "lucide-react";
import { PreferenceCollection } from "@/lib/user-prefs";

export function SortOptions({
  userPrefs,
  setUserPrefs,
}: {
  userPrefs: PreferenceCollection;
  setUserPrefs: Dispatch<SetStateAction<PreferenceCollection>>;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant={"outline"} aria-label="Change sorting value">
          <ArrowDownUp /> <span className="hidden md:inline">Sort by</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={userPrefs.sortBy}>
          {sorters.map(({ key, label }, i) => (
            <DropdownMenuRadioItem
              key={i}
              value={key}
              onClick={() => {
                setUserPrefs((prev) => ({
                  ...prev,
                  sortBy: key,
                }));
              }}
            >
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
