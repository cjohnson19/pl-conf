import { toICal } from "@/lib/event";
import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";

export const dynamicParams = false;

export async function GET(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ slug: keyof typeof Resource.EventList.events }> },
): Promise<NextResponse> {
  const event = Resource.EventList.events[(await params).slug];

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

  const includeDates = req.nextUrl.searchParams?.get("dates");

  return new NextResponse(toICal(event, includeDates === "true"), {
    headers: {
      "Content-Type": "text/calendar",
    },
  });
}

export async function generateStaticParams() {
  return Object.keys(Resource.EventList.events).map((k) => ({
    slug: k,
  }));
}
