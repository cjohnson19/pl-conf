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
import Link from "next/link";

const ICAL_API_URL = process.env.NEXT_PUBLIC_ICAL_API_URL || "";

function getICalUrl(abbreviation: string, includeDates: boolean): string {
  if (!ICAL_API_URL) {
    console.warn("NEXT_PUBLIC_ICAL_API_URL is not configured");
    return "#";
  }
  return `${ICAL_API_URL}/ical/${abbreviation}?dates=${includeDates}`;
}

export function CalendarEvent({ e }: { e: ScheduledEvent }) {
  const withDatesUrl = getICalUrl(e.abbreviation, true);
  const withoutDatesUrl = getICalUrl(e.abbreviation, false);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>Add to calendar</DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuLabel>Online calendar</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link
            target="_blank"
            className="cursor-pointer"
            href={toGoogleCalendarLink(e)}
            aria-label={`Add ${e.abbreviation} event to Google Calendar`}
          >
            Google Calendar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Download .ics file</DropdownMenuLabel>
        <DropdownMenuItem
          asChild
          aria-label={`Download ${e.abbreviation} event with important dates and deadlines`}
        >
          <Link href={withDatesUrl} download className="cursor-pointer">
            With deadlines
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          aria-label={`Download ${e.abbreviation} event without important dates and deadlines`}
        >
          <Link href={withoutDatesUrl} download className="cursor-pointer">
            Main dates only
          </Link>
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
