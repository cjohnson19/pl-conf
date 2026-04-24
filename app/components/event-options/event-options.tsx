"use client";
import { ExternalLink, EyeIcon, EyeOffIcon, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { eventKey, ScheduledEvent } from "@/lib/event";
import { CalendarEvent } from "./calendar-event";
import { usePreferences } from "../preferences-provider";
import Link from "next/link";

export function EventOptions({ e }: { e: ScheduledEvent }) {
  const { prefs, setPrefs } = usePreferences();
  const k = eventKey(e);
  const hidden = prefs.eventPrefs[k]?.hidden ?? false;

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
      <DropdownMenuContent align="start" className="min-w-44">
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
        >
          {hidden ? <EyeIcon /> : <EyeOffIcon />}
          {hidden ? "Unhide" : "Hide"}
        </DropdownMenuItem>
        <CalendarEvent e={e} />
        {e.submissionUrl && (
          <DropdownMenuItem asChild>
            <Link
              href={e.submissionUrl}
              target="_blank"
              className="cursor-pointer no-underline"
            >
              <ExternalLink />
              Visit submission page
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
