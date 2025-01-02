"use client";
import { ScheduledEvent, toGoogleCalendarLink } from "@/lib/event";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { redirect, RedirectType } from "next/navigation";
import Link from "next/link";

export function CalendarEvent({
  e,
  children,
}: {
  e: ScheduledEvent;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuItem>
          <Link
            target="_blank"
            className="no-underline"
            href={toGoogleCalendarLink(e)}
          >
            Add to Google Calendar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            redirect(`/ical/${e.abbreviation}`, RedirectType.push);
          }}
        >
          Download iCalendar file
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
