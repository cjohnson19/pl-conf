import { ScheduledEvent, toICal } from "@/lib/event";
import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";

export const dynamicParams = false;
export const dynamic = "force-static";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const event =
    Resource.EventList.events[
      // This is type safe due to generate static params
      (await params).slug as keyof typeof Resource.EventList.events
    ];

  if (!event) {
    return NextResponse.json(
      {
        error: "Event not found",
      },
      {
        status: 404,
      },
    );
  }

  return new NextResponse(toICal(event), {
    headers: {
      "Content-Type": "text/calendar",
    },
  });
}

export async function generateStaticParams() {
  return Object.entries(Resource.EventList.events).map(
    ([, e]: [string, ScheduledEvent]) => ({
      slug: e.abbreviation,
    }),
  );
}
