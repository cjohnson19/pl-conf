import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import {
  ConditionalCheckFailedException,
  DeleteItemCommand,
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import type { z } from "zod";
import { SubmissionSchema } from "@pl-conf/core/schemas";
import { createHash } from "node:crypto";

const RATE_LIMIT_TABLE_NAME = process.env.RATE_LIMIT_TABLE_NAME!;
const SUBMISSION_EMAIL_SENDER = process.env.SUBMISSION_EMAIL_SENDER!;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL!;

interface APIGatewayEvent {
  body: string;
  headers: Record<string, string | undefined>;
  requestContext: {
    http: {
      sourceIp: string;
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
const DUPLICATE_WINDOW_SECONDS = 24 * 60 * 60;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(
  statusCode: number,
  body: unknown,
  extraHeaders?: Record<string, string>
): APIGatewayResponse {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, ...extraHeaders },
    body: JSON.stringify(body),
  };
}

// One atomic increment-with-cap per request: concurrent requests can't both
// read the same count and slip past the limit. Fails open on infra errors so
// a DynamoDB hiccup doesn't block legitimate submissions.
async function consumeRateLimit(
  ip: string
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Math.floor(Date.now() / 1000);
  const key = `rate_limit_${ip}_${Math.floor(now / RATE_LIMIT_WINDOW)}`;

  try {
    const result = await dynamodb.send(
      new UpdateItemCommand({
        TableName: RATE_LIMIT_TABLE_NAME,
        Key: { id: { S: key } },
        UpdateExpression:
          "ADD #count :one SET #ttl = if_not_exists(#ttl, :ttl)",
        ConditionExpression: "attribute_not_exists(#count) OR #count < :limit",
        ExpressionAttributeNames: { "#count": "count", "#ttl": "ttl" },
        ExpressionAttributeValues: {
          ":one": { N: "1" },
          ":limit": { N: RATE_LIMIT_REQUESTS.toString() },
          ":ttl": { N: (now + RATE_LIMIT_WINDOW).toString() },
        },
        ReturnValues: "ALL_NEW",
      })
    );
    const count = Number(result.Attributes?.count?.N ?? "1");
    return {
      allowed: true,
      remaining: Math.max(0, RATE_LIMIT_REQUESTS - count),
    };
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return { allowed: false, remaining: 0 };
    }
    console.error("Rate limit check failed:", error);
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS };
  }
}

// Claims the URL's duplicate slot atomically — of two concurrent identical
// submissions, exactly one wins the conditional put. The claim is written
// BEFORE the email so the race is closed, and released again if the send
// fails so a retry isn't locked out for 24h.
async function claimSubmission(submissionHash: string): Promise<boolean> {
  const ttl = Math.floor(Date.now() / 1000) + DUPLICATE_WINDOW_SECONDS;
  try {
    await dynamodb.send(
      new PutItemCommand({
        TableName: RATE_LIMIT_TABLE_NAME,
        Item: {
          id: { S: `duplicate_${submissionHash}` },
          ttl: { N: ttl.toString() },
        },
        ConditionExpression: "attribute_not_exists(id)",
      })
    );
    return true;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return false;
    }
    console.error("Duplicate check failed:", error);
    return true;
  }
}

async function releaseSubmission(submissionHash: string): Promise<void> {
  try {
    await dynamodb.send(
      new DeleteItemCommand({
        TableName: RATE_LIMIT_TABLE_NAME,
        Key: { id: { S: `duplicate_${submissionHash}` } },
      })
    );
  } catch (error) {
    console.error("Failed to release duplicate claim:", error);
  }
}

function hashSubmission(data: z.infer<typeof SubmissionSchema>): string {
  return createHash("sha256").update(data.url).digest("hex");
}

function parseSubmission(
  body: string
): z.infer<typeof SubmissionSchema> | undefined {
  try {
    return SubmissionSchema.parse(JSON.parse(body));
  } catch {
    return undefined;
  }
}

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayResponse> => {
  try {
    // Validate before touching any quota: a malformed request must not
    // consume one of the submitter's rate-limit slots.
    const submission = parseSubmission(event.body);
    if (submission === undefined) {
      return json(400, {
        error: "Validation failed",
        message: "Body must be JSON with a valid `url`.",
      });
    }

    const rateLimit = await consumeRateLimit(
      event.requestContext.http.sourceIp
    );
    if (!rateLimit.allowed) {
      return json(
        429,
        {
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
        },
        {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": Math.floor(
            Date.now() / 1000 + RATE_LIMIT_WINDOW
          ).toString(),
        }
      );
    }

    const submissionHash = hashSubmission(submission);
    if (!(await claimSubmission(submissionHash))) {
      return json(
        409,
        {
          error: "Duplicate submission",
          message: "This URL has already been submitted recently.",
        },
        { "X-RateLimit-Remaining": rateLimit.remaining.toString() }
      );
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
      await releaseSubmission(submissionHash);
      return json(502, {
        error: "Submission failed",
        message: "Couldn't deliver the submission. Please try again.",
      });
    }

    return json(
      200,
      { message: "Submission received" },
      { "X-RateLimit-Remaining": rateLimit.remaining.toString() }
    );
  } catch (error) {
    console.error("Submission error:", error);
    return json(500, {
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
