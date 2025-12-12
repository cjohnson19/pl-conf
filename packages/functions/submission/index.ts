import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";
import { z } from "zod";
import { SubmissionSchema } from "@pl-conf/core";
import YAML from "yaml";
import { createHash } from "crypto";

interface APIGatewayEvent {
  httpMethod: string;
  body: string;
  headers: Record<string, string | undefined>;
  requestContext?: {
    http?: {
      sourceIp?: string;
    };
  };
}

interface APIGatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const s3 = new S3Client();
const ses = new SESv2Client();
const dynamodb = new DynamoDBClient();

// Rate limiting: 5 submissions per IP per hour
const RATE_LIMIT_REQUESTS = 5;
const RATE_LIMIT_WINDOW = 60 * 60; // 1 hour in seconds

async function checkRateLimit(
  ip: string
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Math.floor(Date.now() / 1000);
  const key = `rate_limit_${ip}_${Math.floor(now / RATE_LIMIT_WINDOW)}`;

  try {
    const result = await dynamodb.send(
      new GetItemCommand({
        TableName: Resource.RateLimitTable.name,
        Key: { id: { S: key } },
      })
    );

    const currentCount = result.Item
      ? parseInt(result.Item.count?.N || "0")
      : 0;

    if (currentCount >= RATE_LIMIT_REQUESTS) {
      return { allowed: false, remaining: 0 };
    }

    // Increment counter
    await dynamodb.send(
      new PutItemCommand({
        TableName: Resource.RateLimitTable.name,
        Item: {
          id: { S: key },
          count: { N: (currentCount + 1).toString() },
          ttl: { N: (now + RATE_LIMIT_WINDOW).toString() },
        },
      })
    );

    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - currentCount - 1 };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Allow request on error to avoid blocking legitimate users
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS };
  }
}

async function checkDuplicate(
  submissionHash: string
): Promise<{ isDuplicate: boolean }> {
  const key = `duplicate_${submissionHash}`;
  const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours

  try {
    const result = await dynamodb.send(
      new GetItemCommand({
        TableName: Resource.RateLimitTable.name,
        Key: { id: { S: key } },
      })
    );

    if (result.Item) {
      return { isDuplicate: true };
    }

    // Store hash to prevent duplicates
    await dynamodb.send(
      new PutItemCommand({
        TableName: Resource.RateLimitTable.name,
        Item: {
          id: { S: key },
          ttl: { N: ttl.toString() },
        },
      })
    );

    return { isDuplicate: false };
  } catch (error) {
    console.error("Duplicate check failed:", error);
    // Allow request on error
    return { isDuplicate: false };
  }
}

function hashSubmission(data: z.infer<typeof SubmissionSchema>): string {
  // Create hash from core submission data
  const hashData = {
    name: data.name,
    abbreviation: data.abbreviation,
    type: data.type,
    url: data.url,
    location: data.location,
  };
  return createHash("sha256").update(JSON.stringify(hashData)).digest("hex");
}

function getClientIP(event: APIGatewayEvent): string {
  return (
    event.requestContext?.http?.sourceIp ||
    event.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
    event.headers?.["x-real-ip"] ||
    "unknown"
  );
}

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayResponse> => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(event);

    // Check rate limiting
    const rateLimitResult = await checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      return {
        statusCode: 429,
        headers: {
          ...headers,
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": Math.floor(
            Date.now() / 1000 + RATE_LIMIT_WINDOW
          ).toString(),
        },
        body: JSON.stringify({
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
        }),
      };
    }

    // Parse and validate the request body
    const body = JSON.parse(event.body);
    const eventData = SubmissionSchema.parse(body);

    // Check for duplicate submissions
    const submissionHash = hashSubmission(eventData);
    const duplicateResult = await checkDuplicate(submissionHash);
    if (duplicateResult.isDuplicate) {
      return {
        statusCode: 409,
        headers: {
          ...headers,
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
        body: JSON.stringify({
          error: "Duplicate submission",
          message: "This event has already been submitted recently.",
        }),
      };
    }

    const eventWithTimestamp = {
      ...eventData,
      lastUpdated: new Date().toISOString().split("T")[0], // YYYY-MM-DD format
    };

    // Generate filenames
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const yamlKey = `pending/${timestamp}-${eventData.abbreviation}.yaml`;
    const metadataKey = `pending/${timestamp}-${eventData.abbreviation}.json`;

    // Convert event data to YAML
    const yamlContent = YAML.stringify(eventWithTimestamp);

    await s3.send(
      new PutObjectCommand({
        Bucket: Resource.SubmissionsBucket.name,
        Key: yamlKey,
        Body: yamlContent,
        ContentType: "application/x-yaml",
      })
    );

    // Send notification email
    try {
      await ses.send(
        new SendEmailCommand({
          FromEmailAddress: Resource.SubmissionEmail.sender,
          Destination: {
            ToAddresses: [Resource.NotificationEmail.value],
          },
          Content: {
            Simple: {
              Subject: {
                Data: `New Event Submission: ${eventData.name} (${eventData.abbreviation})`,
              },
              Body: {
                Text: {
                  Data: `New event submission received:

=== EVENT DETAILS ===
Name: ${eventData.name}
Abbreviation: ${eventData.abbreviation}
Type: ${eventData.type}
${eventData.location ? `Location: ${eventData.location}` : ""}
${eventData.url ? `URL: ${eventData.url}` : ""}

Event Dates:
Start: ${eventData.date?.start !== "TBD" ? eventData.date.start : "TBD"}
End: ${eventData.date?.end !== "TBD" ? eventData.date.end : "TBD"}

${
  Object.keys(eventData.importantDates || {}).length > 0
    ? `Important Dates:
${Object.entries(eventData.importantDates || {})
  .map(([type, date]) => `${type}: ${date}`)
  .join("\n")}
${eventData.importantDateUrl ? `Reference: ${eventData.importantDateUrl}` : ""}`
    : ""
}

${
  eventData.notes && eventData.notes.length > 0
    ? `Notes:
${eventData.notes.join("\n")}`
    : ""
}

=== SUBMISSION INFO ===
Submitted at: ${new Date().toISOString()}

Review the submission files in the S3 bucket:
- YAML: ${yamlKey}
- Metadata: ${metadataKey}`,
                },
              },
            },
          },
        })
      );
    } catch (emailError) {
      console.error("Failed to send notification email:", emailError);
      // Don't fail the entire request if email fails
    }

    return {
      statusCode: 200,
      headers: {
        ...headers,
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      },
      body: JSON.stringify({
        message: "Event submission received successfully",
        submissionId: `${timestamp}-${eventData.abbreviation}`,
      }),
    };
  } catch (error) {
    console.error("Submission error:", error);

    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Validation failed",
          details: error.errors,
        }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
