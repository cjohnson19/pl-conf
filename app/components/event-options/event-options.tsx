"use client";
import { EyeIcon, EyeOffIcon, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { ScheduledEvent } from "@/lib/event";
import { CalendarEvent } from "./calendar-event";
import { eventKey } from "@/lib/user-prefs";
import { usePreferences } from "../preferences-provider";

export function EventOptions({ e }: { e: ScheduledEvent }) {
  const { prefs, setPrefs } = usePreferences();
  const k = eventKey(e);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={"ghost"}
          size={"icon"}
          aria-label={`Perform actions on the ${e.abbreviation}`}
        >
          <Menu />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onClick={() => {
            setPrefs((prev) => ({
              ...prev,
              eventPrefs: {
                ...prev.eventPrefs,
                [k]: {
                  ...prev.eventPrefs[eventKey(e)],
                  hidden: !(prev.eventPrefs[k]?.hidden ?? false),
                },
              },
            }));
          }}
          className="flex justify-between"
        >
          {(prefs.eventPrefs[k]?.hidden ?? false) ? (
            <>
              Unhide <EyeIcon />
            </>
          ) : (
            <>
              Hide <EyeOffIcon />
            </>
          )}
        </DropdownMenuItem>
        <CalendarEvent e={e} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
