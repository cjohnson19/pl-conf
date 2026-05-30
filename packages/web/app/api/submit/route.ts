import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { SubmissionSchema } from "@pl-conf/core/schemas";
import { Resend } from "resend";

// node:crypto + the Resend SDK need the Node runtime; Upstash is HTTP-based so
// it works either way.
export const runtime = "nodejs";

const redis = Redis.fromEnv();

// Sliding window — a strict improvement over the old fixed-hour bucket, where a
// caller could burn the whole quota at :59 and again at :00.
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  prefix: "submit_rate_limit",
});

const resend = new Resend(process.env.RESEND_API_KEY);
const SUBMISSION_EMAIL_SENDER = process.env.SUBMISSION_EMAIL_SENDER!;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL!;

const DEDUP_TTL_SECONDS = 24 * 60 * 60;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // Fail open on a store outage: a Redis blip should degrade rate limiting, not
  // reject a legitimate submission. Mirrors the old DynamoDB handler.
  try {
    const { success, reset } = await ratelimit.limit(ip);
    if (!success) {
      return Response.json(
        {
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.floor(reset / 1000).toString(),
          },
        }
      );
    }
  } catch (error) {
    console.error("Rate limit check failed:", error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid request", message: "Could not parse request body." },
      { status: 400 }
    );
  }

  const parsed = SubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.errors },
      { status: 400 }
    );
  }
  const submission = parsed.data;

  // SET NX EX returns null when the key already exists — i.e. the same URL was
  // submitted within the dedup window. Fail open if the store is unreachable.
  try {
    const dedupKey = `submit_dup_${createHash("sha256")
      .update(submission.url)
      .digest("hex")}`;
    const stored = await redis.set(dedupKey, "1", {
      nx: true,
      ex: DEDUP_TTL_SECONDS,
    });
    if (stored === null) {
      return Response.json(
        {
          error: "Duplicate submission",
          message: "This URL has already been submitted recently.",
        },
        { status: 409 }
      );
    }
  } catch (error) {
    console.error("Duplicate check failed:", error);
  }

  // A failed email shouldn't fail the request — the submitter did their part.
  try {
    await resend.emails.send({
      from: SUBMISSION_EMAIL_SENDER,
      to: NOTIFICATION_EMAIL,
      subject: `New Event Submission: ${submission.url}`,
      text: `New event submission received.\n\nURL: ${submission.url}\n\nSubmitted at: ${new Date().toISOString()}`,
    });
  } catch (error) {
    console.error("Failed to send notification email:", error);
  }

  return Response.json({ message: "Submission received" }, { status: 200 });
}
