"use client";
import { eventKey, ScheduledEvent, toGoogleCalendarLink } from "@/lib/event";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import Link from "next/link";
import { CalendarPlus, Calendar, Download } from "lucide-react";

const ICAL_API_URL = process.env.NEXT_PUBLIC_ICAL_API_URL || "";

function getICalUrl(slug: string, includeDates: boolean): string {
  if (!ICAL_API_URL) {
    console.warn("NEXT_PUBLIC_ICAL_API_URL is not configured");
    return "#";
  }
  return `${ICAL_API_URL}/ical/${slug}?dates=${includeDates}`;
}

export function CalendarEvent({ e }: { e: ScheduledEvent }) {
  const slug = eventKey(e);
  const withDatesUrl = getICalUrl(slug, true);
  const withoutDatesUrl = getICalUrl(slug, false);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <CalendarPlus />
        Add to calendar
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal uppercase tracking-wide">
          Online
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link
            target="_blank"
            className="cursor-pointer no-underline"
            href={toGoogleCalendarLink(e)}
            aria-label={`Add ${e.abbreviation} event to Google Calendar`}
          >
            <Calendar />
            Google Calendar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal uppercase tracking-wide">
          Download .ics
        </DropdownMenuLabel>
        <DropdownMenuItem
          asChild
          aria-label={`Download ${e.abbreviation} event with important dates and deadlines`}
        >
          <Link
            href={withDatesUrl}
            download
            className="cursor-pointer no-underline"
          >
            <Download />
            With deadlines
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          aria-label={`Download ${e.abbreviation} event without important dates and deadlines`}
        >
          <Link
            href={withoutDatesUrl}
            download
            className="cursor-pointer no-underline"
          >
            <Download />
            Main dates only
          </Link>
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
