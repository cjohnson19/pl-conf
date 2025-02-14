"use client";
import { ScheduledEvent, toGoogleCalendarLink } from "@/lib/event";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { redirect, RedirectType } from "next/navigation";
import Link from "next/link";

export function CalendarEvent({ e }: { e: ScheduledEvent }) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>Add to calendar</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuLabel>Online calendar</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => {
            redirect(toGoogleCalendarLink(e));
          }}
        >
          <Link
            target="_blank"
            className="no-underline"
            href={toGoogleCalendarLink(e)}
            aria-label={`Add ${e.abbreviation} event to Google Calendar`}
          >
            Google Calendar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Download .ics file</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => {
            redirect(`/ical/${e.abbreviation}?dates=true`, RedirectType.push);
          }}
          aria-label={`Download ${e.abbreviation} event with important dates and deadlines`}
        >
          With deadlines
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            redirect(`/ical/${e.abbreviation}?dates=false`, RedirectType.push);
          }}
          aria-label={`Download ${e.abbreviation} event without important dates and deadlines`}
        >
          Main dates only
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
