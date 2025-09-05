import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { Resource } from "sst";
import { z } from "zod";
import { SubmissionSchema } from "@pl-conf/core";
import YAML from "yaml";

const s3 = new S3Client();
const ses = new SESv2Client();

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
