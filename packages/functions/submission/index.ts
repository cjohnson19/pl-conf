import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { z } from "zod";
import { SubmissionSchema } from "@pl-conf/core/schemas";
import { createHash } from "crypto";

const RATE_LIMIT_TABLE_NAME = process.env.RATE_LIMIT_TABLE_NAME!;
const SUBMISSION_EMAIL_SENDER = process.env.SUBMISSION_EMAIL_SENDER!;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL!;

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

const ses = new SESv2Client();
const dynamodb = new DynamoDBClient();

const RATE_LIMIT_REQUESTS = 5;
const RATE_LIMIT_WINDOW = 60 * 60;

async function checkRateLimit(
  ip: string
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Math.floor(Date.now() / 1000);
  const key = `rate_limit_${ip}_${Math.floor(now / RATE_LIMIT_WINDOW)}`;

  try {
    const result = await dynamodb.send(
      new GetItemCommand({
        TableName: RATE_LIMIT_TABLE_NAME,
        Key: { id: { S: key } },
      })
    );

    const currentCount = result.Item
      ? parseInt(result.Item.count?.N || "0")
      : 0;

    if (currentCount >= RATE_LIMIT_REQUESTS) {
      return { allowed: false, remaining: 0 };
    }

    await dynamodb.send(
      new PutItemCommand({
        TableName: RATE_LIMIT_TABLE_NAME,
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
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS };
  }
}

async function checkDuplicate(
  submissionHash: string
): Promise<{ isDuplicate: boolean }> {
  const key = `duplicate_${submissionHash}`;
  const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

  try {
    const result = await dynamodb.send(
      new GetItemCommand({
        TableName: RATE_LIMIT_TABLE_NAME,
        Key: { id: { S: key } },
      })
    );

    if (result.Item) {
      return { isDuplicate: true };
    }

    await dynamodb.send(
      new PutItemCommand({
        TableName: RATE_LIMIT_TABLE_NAME,
        Item: {
          id: { S: key },
          ttl: { N: ttl.toString() },
        },
      })
    );

    return { isDuplicate: false };
  } catch (error) {
    console.error("Duplicate check failed:", error);
    return { isDuplicate: false };
  }
}

function hashSubmission(data: z.infer<typeof SubmissionSchema>): string {
  return createHash("sha256").update(data.url).digest("hex");
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

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const clientIP = getClientIP(event);

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

    const body = JSON.parse(event.body);
    const submission = SubmissionSchema.parse(body);

    const submissionHash = hashSubmission(submission);
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
          message: "This URL has already been submitted recently.",
        }),
      };
    }

    try {
      await ses.send(
        new SendEmailCommand({
          FromEmailAddress: SUBMISSION_EMAIL_SENDER,
          Destination: { ToAddresses: [NOTIFICATION_EMAIL] },
          Content: {
            Simple: {
              Subject: { Data: `New Event Submission: ${submission.url}` },
              Body: {
                Text: {
                  Data: `New event submission received.

URL: ${submission.url}

Submitted at: ${new Date().toISOString()}`,
                },
              },
            },
          },
        })
      );
    } catch (emailError) {
      console.error("Failed to send notification email:", emailError);
    }

    return {
      statusCode: 200,
      headers: {
        ...headers,
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      },
      body: JSON.stringify({ message: "Submission received" }),
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
