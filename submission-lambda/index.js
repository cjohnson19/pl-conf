import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { Resource } from "sst";
import { z } from "zod";
import YAML from "yaml";

const s3 = new S3Client();
const ses = new SESv2Client();

// Define the schema locally to avoid import issues
const DateSchema = z
  .string()
  .date()
  .transform((d) => d.replaceAll("-", "/"));

const TBD = z.literal("TBD");
const MaybeDate = z.union([TBD, DateSchema]);

const DateName = z.enum([
  "abstract",
  "paper",
  "notification",
  "rebuttal",
  "conditional-acceptance",
  "camera-ready",
  "revisions",
]);

const EventType = z.enum(["conference", "workshop", "symposium"]);

const SubmissionSchema = z
  .object({
    name: z.string().nonempty(),
    abbreviation: z.string().nonempty(),
    date: z
      .object({
        start: MaybeDate,
        end: MaybeDate,
      })
      .optional()
      .default({ start: "TBD", end: "TBD" }),
    location: z.string().optional(),
    importantDateUrl: z.string().url().optional(),
    url: z.string().url().optional(),
    importantDates: z.record(DateName, z.union([TBD, DateSchema])).default({}),
    notes: z.string().array().default([]),
    type: EventType,
  })
  .strict();

export const handler = async (event) => {
  const headers = {
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
    // Parse and validate the request body
    const body = JSON.parse(event.body);
    const eventData = SubmissionSchema.parse(body);

    // Add current timestamp as lastUpdated
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

    // Create metadata object
    const metadata = {
      submittedAt: new Date().toISOString(),
      abbreviation: eventData.abbreviation,
      name: eventData.name,
    };

    // Store in S3
    await Promise.all([
      // Store the event YAML
      s3.send(
        new PutObjectCommand({
          Bucket: Resource.SubmissionsBucket.name,
          Key: yamlKey,
          Body: yamlContent,
          ContentType: "application/x-yaml",
        })
      ),
      // Store the metadata
      s3.send(
        new PutObjectCommand({
          Bucket: Resource.SubmissionsBucket.name,
          Key: metadataKey,
          Body: JSON.stringify(metadata, null, 2),
          ContentType: "application/json",
        })
      ),
    ]);

    // Send notification email
    try {
      await ses.send(
        new SendEmailCommand({
          FromEmailAddress: Resource.SubmissionEmail.sender,
          Destination: {
            ToAddresses: ["cjohnson19@pm.me"],
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
      headers,
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
        message: error.message,
      }),
    };
  }
};
