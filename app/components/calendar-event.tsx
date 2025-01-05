"use client";
import { ScheduledEvent, toGoogleCalendarLink } from "@/lib/event";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
            aria-label={`Add ${e.abbreviation} event to Google Calendar`}
          >
            Add to Google Calendar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            Download iCalendar file
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => {
                  redirect(
                    `/ical/${e.abbreviation}?dates=true`,
                    RedirectType.push,
                  );
                }}
                aria-label={`Download ${e.abbreviation} event with important dates and deadlines`}
              >
                With important dates and deadlines
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  redirect(
                    `/ical/${e.abbreviation}?dates=false`,
                    RedirectType.push,
                  );
                }}
                aria-label={`Download ${e.abbreviation} event without important dates and deadlines`}
              >
                Main conference only
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
