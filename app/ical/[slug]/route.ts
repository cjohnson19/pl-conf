import { fromYaml, ScheduledEvent, toICal } from "@/lib/event";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";

const res = await readFile(process.cwd() + "/data/conf.yaml", "utf8");
const es = fromYaml(res);
const events = Object.fromEntries(
  es.map((e: ScheduledEvent) => [e.abbreviation, e]),
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const event = events[(await params).slug];

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
