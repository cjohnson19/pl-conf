"use client";

import { Dispatch, SetStateAction } from "react";
import { CalendarClock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { PreferenceCollection } from "@/lib/user-prefs";

export function ExactTimeToggle({
  value,
  setPrefs,
}: {
  value: boolean;
  setPrefs: Dispatch<SetStateAction<PreferenceCollection>>;
}) {
  const radioValue = value ? "exact" : "date";
  const setExact = (exact: boolean) =>
    setPrefs((prev) => ({
      ...prev,
      display: { ...prev.display, exactDeadlineTime: exact },
    }));

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label="Toggle between date-only and exact AOE deadline times"
        >
          <CalendarClock />
          <span className="hidden md:inline">Deadline display</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={radioValue}>
          <DropdownMenuRadioItem value="date" onClick={() => setExact(false)}>
            Date only
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="exact" onClick={() => setExact(true)}>
            Exact time in my timezone
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
