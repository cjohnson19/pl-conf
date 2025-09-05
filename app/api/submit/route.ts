import { Resource } from "sst";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("API route received body:", body);

    const apiUrl = `${Resource.SubmissionApi.url}/submit`;
    console.log("Forwarding to:", apiUrl);

    // Forward the request to the actual submission lambda
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log("Lambda response status:", response.status);
    console.log(
      "Lambda response headers:",
      Object.fromEntries(response.headers)
    );

    const result = await response.json();
    console.log("Lambda response body:", result);

    if (!response.ok) {
      console.error("Lambda returned error:", result);
      return NextResponse.json(result, { status: response.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("API route error:", error);
    console.error("Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
