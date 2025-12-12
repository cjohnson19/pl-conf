import { toICal } from "@/lib/event";
import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";
import { getYear } from "date-fns";

export const dynamicParams = false;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse> {
  const { slug } = await params;
  const eventSlug = slug as keyof typeof Resource.EventList.events;
  const event = Resource.EventList.events[eventSlug];

  if (!event) {
    return NextResponse.json(
      {
        error: "Event not found",
      },
      {
        status: 404,
      }
    );
  }

  const includeDates = req.nextUrl.searchParams?.get("dates");

  return new NextResponse(toICal(event, includeDates === "true"), {
    headers: {
      "Content-Type": "text/calendar",
      "Content-Disposition": `attachment; filename=${event.abbreviation}-${getYear(event.date.start)}.ics`,
    },
  });
}

export async function generateStaticParams() {
  return Object.keys(Resource.EventList.events).map((k) => ({
    slug: k,
  }));
}
