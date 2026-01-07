import { toICal } from "@pl-conf/core";
import { events } from "../../../generated/events";

interface APIGatewayEvent {
  pathParameters?: {
    slug?: string;
  };
  queryStringParameters?: {
    dates?: string;
  };
}

interface APIGatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayResponse> => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  const slug = event.pathParameters?.slug;

  if (!slug) {
    return {
      statusCode: 400,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing event slug" }),
    };
  }

  const conferenceEvent = events[slug];

  if (!conferenceEvent) {
    return {
      statusCode: 404,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Event not found" }),
    };
  }

  const includeDates = event.queryStringParameters?.dates === "true";

  try {
    const icalContent = toICal(conferenceEvent, includeDates);

    if (!icalContent) {
      return {
        statusCode: 400,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Event dates are TBD, cannot generate calendar",
        }),
      };
    }

    const year =
      conferenceEvent.date.start !== "TBD"
        ? new Date(conferenceEvent.date.start).getFullYear()
        : new Date().getFullYear();

    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename=${conferenceEvent.abbreviation}-${year}.ics`,
      },
      body: icalContent,
    };
  } catch (error) {
    console.error("Error generating iCal:", error);
    return {
      statusCode: 500,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to generate calendar file",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
