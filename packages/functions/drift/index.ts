import { DomUtils, parseDocument } from "htmlparser2";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { isActive } from "@pl-conf/core";
import diff from "fast-diff";
import { events } from "../../../generated/events";

interface EventWebInfo {
  main?: string;
  importantDates?: string;
}

interface DiffResult {
  diffs: diff.Diff[];
  addedCount: number;
  removedCount: number;
  hasChanges: boolean;
}

function bind<T, U>(v: T | undefined | null, f: (x: T) => U): U | undefined {
  return v === undefined || v === null ? undefined : f(v);
}

function zip<T, U>(a: T[], b: U[]): [T, U][] {
  return a.map((_, i) => [a[i], b[i]]);
}
const s3Client = new S3Client();

function diffContent(
  stored: string | undefined,
  current: string | undefined
): DiffResult {
  const f = (v: string) =>
    bind(
      DomUtils.findOne((node) => node.name === "body", parseDocument(v)),
      (v) => DomUtils.innerText(v)
    );
  const a = bind(stored, f) ?? "";
  const b = bind(current, f) ?? "";
  const diffs = diff(a, b);

  let addedCount = 0;
  let removedCount = 0;

  diffs.forEach(([flag, text]) => {
    if (flag === 1) addedCount += text.length;
    if (flag === -1) removedCount += text.length;
  });

  return {
    diffs: diffs.filter(([flag]) => flag !== 0),
    addedCount,
    removedCount,
    hasChanges: diffs.some(([flag]) => flag !== 0),
  };
}

function formatDiffSection(diffs: diff.Diff[]): string {
  if (diffs.length === 0) {
    return '<div style="color: #666; font-style: italic;">No changes detected</div>';
  }

  // Group consecutive diffs with context
  let html =
    '<div style="font-family: monospace; font-size: 12px; line-height: 1.4; background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto;">';

  let changeBuffer = "";
  let inChangeBlock = false;

  // Process diffs to create readable blocks
  for (let i = 0; i < diffs.length; i++) {
    const [flag, text] = diffs[i];

    if (flag === 0) {
      // Context text
      const lines = text.split("\n");
      const contextLines = lines.slice(-2).join("\n"); // Keep last 2 lines as context

      if (inChangeBlock && changeBuffer) {
        // Output the change block
        html += formatChangeBlock(changeBuffer);
        changeBuffer = "";
        inChangeBlock = false;
      }

      if (contextLines.trim()) {
        html += `<div style="color: #666; margin: 4px 0;">...${escapeHtml(
          contextLines
        )}</div>`;
      }
    } else {
      // Changed text
      inChangeBlock = true;
      const prefix = flag === 1 ? "+" : "-";
      const color = flag === 1 ? "#22863a" : "#cb2431";
      const bgColor = flag === 1 ? "#e6ffed" : "#ffeef0";

      const lines = text.split("\n").filter((line) => line.trim());
      lines.forEach((line) => {
        changeBuffer += `<div style="background: ${bgColor}; color: ${color}; padding: 2px 4px; margin: 1px 0; border-left: 3px solid ${color};">${prefix} ${escapeHtml(
          line
        )}</div>`;
      });
    }
  }

  // Output any remaining changes
  if (changeBuffer) {
    html += formatChangeBlock(changeBuffer);
  }

  html += "</div>";
  return html;
}

function formatChangeBlock(changes: string): string {
  return `<div style="margin: 8px 0;">${changes}</div>`;
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function formatDiffSummary(addedCount: number, removedCount: number): string {
  const parts = [];
  if (addedCount > 0) {
    parts.push(
      `<span style="color: #22863a;">+${addedCount} characters added</span>`
    );
  }
  if (removedCount > 0) {
    parts.push(
      `<span style="color: #cb2431;">-${removedCount} characters removed</span>`
    );
  }
  return parts.length > 0
    ? parts.join(", ")
    : '<span style="color: #666;">No changes</span>';
}

const WEBPAGE_BUCKET_NAME = process.env.WEBPAGE_BUCKET_NAME!;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL!;
const DRIFT_EMAIL_SENDER =
  process.env.DRIFT_EMAIL_SENDER || "drift-production@pl-conferences.com";

async function getStoredEventInfo(): Promise<Record<string, EventWebInfo>> {
  const eventAbbrevs = Object.keys(events);
  const importantDatePages: PromiseSettledResult<
    Pick<EventWebInfo, "importantDates">
  >[] = await Promise.allSettled(
    eventAbbrevs.map(async (abbrev) => {
      const getImportantDatesCommand = new GetObjectCommand({
        Bucket: WEBPAGE_BUCKET_NAME,
        Key: `${abbrev}-dates.html`,
      });
      const res = await s3Client.send(getImportantDatesCommand);
      return {
        importantDates: await res.Body!.transformToString(),
      };
    })
  );
  const mainPages: PromiseSettledResult<Pick<EventWebInfo, "main">>[] =
    await Promise.allSettled(
      eventAbbrevs.map(async (abbrev) => {
        const getMainCommand = new GetObjectCommand({
          Bucket: WEBPAGE_BUCKET_NAME,
          Key: `${abbrev}-main.html`,
        });
        const res = await s3Client.send(getMainCommand);
        return {
          main: await res.Body!.transformToString(),
        };
      })
    );

  return Object.fromEntries(
    zip(mainPages, importantDatePages).map(([r1, r2], i) => [
      eventAbbrevs[i],
      {
        ...(r1.status === "fulfilled" ? r1.value : {}),
        ...(r2.status === "fulfilled" ? r2.value : {}),
      },
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any;
}

async function getCurrentEventInfo(): Promise<Record<string, EventWebInfo>> {
  const es = Object.values(events).filter(isActive);
  const mainPages: PromiseSettledResult<Pick<EventWebInfo, "main">>[] =
    await Promise.allSettled(
      es.map(async (e) => {
        if (e.url === undefined) {
          return {};
        }
        const mainPage = await fetch(e.url, {
          headers: {
            "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
          },
        });
        return {
          main: await mainPage.text(),
        };
      })
    );
  const cachedDatePages: PromiseSettledResult<
    Pick<EventWebInfo, "importantDates">
  >[] = await Promise.allSettled(
    es.map(async (e) => {
      if (e.importantDateUrl === undefined) {
        return {};
      }
      const datePage = await fetch(e.importantDateUrl);
      return {
        importantDates: await datePage.text(),
      };
    })
  );

  return Object.fromEntries(
    zip(mainPages, cachedDatePages).map(([r1, r2], i) => [
      es[i].abbreviation,
      {
        ...(r1.status === "fulfilled" ? r1.value : {}),
        ...(r2.status === "fulfilled" ? r2.value : {}),
      },
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any;
}

function toTable(
  drifts: [string, { main: DiffResult; importantDates: DiffResult }][]
) {
  const getUrl = (prop: string, abbrev: string): string => {
    const event = events[abbrev];
    if (!event) return "Url not available";
    return prop in event
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((event as any)[prop] as string)
      : "Url not available";
  };

  // Filter to only show events with changes
  const eventsWithChanges = drifts.filter(
    ([, drift]) => drift.main.hasChanges || drift.importantDates.hasChanges
  );

  if (eventsWithChanges.length === 0) {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; color: #666;">
        <h2>No changes detected in any monitored events</h2>
        <p>All conference websites remain unchanged since the last check.</p>
      </div>
    `;
  }

  return `
    <style>
      .drift-table {
        font-family: Arial, sans-serif;
        border-collapse: collapse;
        width: 100%;
        max-width: 1200px;
        margin: 20px auto;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .drift-table th {
        background-color: #f8f9fa;
        color: #333;
        font-weight: bold;
        padding: 12px;
        text-align: left;
        border-bottom: 2px solid #dee2e6;
      }
      .drift-table td {
        padding: 12px;
        vertical-align: top;
        border-bottom: 1px solid #dee2e6;
      }
      .drift-table tr:hover {
        background-color: #f8f9fa;
      }
      .event-name {
        font-weight: bold;
        color: #0066cc;
        font-size: 16px;
      }
      .change-summary {
        font-size: 12px;
        color: #666;
        margin-top: 4px;
      }
      .diff-section {
        margin-top: 8px;
      }
      .section-header {
        font-weight: bold;
        color: #333;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .view-link {
        font-size: 12px;
        color: #0066cc;
        text-decoration: none;
      }
      .view-link:hover {
        text-decoration: underline;
      }
      .no-changes {
        color: #666;
        font-style: italic;
        font-size: 14px;
      }
    </style>

    <table class="drift-table">
      <thead>
        <tr>
          <th style="width: 15%;">Conference</th>
          <th style="width: 42.5%;">Main Page Changes</th>
          <th style="width: 42.5%;">Important Dates Changes</th>
        </tr>
      </thead>
      <tbody>
        ${eventsWithChanges
          .map(([abbrev, drift]) => {
            const eventName = events[abbrev]?.name || abbrev;

            return `
              <tr>
                <td>
                  <div class="event-name">${abbrev.toUpperCase()}</div>
                  <div style="font-size: 12px; color: #666; margin-top: 2px;">${eventName}</div>
                </td>
                <td>
                  ${
                    drift.main.hasChanges
                      ? `
                    <div class="section-header">
                      <span>Main Page</span>
                      <a href="${getUrl(
                        "url",
                        abbrev
                      )}" class="view-link" target="_blank">View Page →</a>
                    </div>
                    <div class="change-summary">${formatDiffSummary(
                      drift.main.addedCount,
                      drift.main.removedCount
                    )}</div>
                    <div class="diff-section">
                      ${formatDiffSection(drift.main.diffs)}
                    </div>
                  `
                      : '<div class="no-changes">No changes detected</div>'
                  }
                </td>
                <td>
                  ${
                    drift.importantDates.hasChanges
                      ? `
                    <div class="section-header">
                      <span>Important Dates</span>
                      <a href="${getUrl(
                        "importantDateUrl",
                        abbrev
                      )}" class="view-link" target="_blank">View Page →</a>
                    </div>
                    <div class="change-summary">${formatDiffSummary(
                      drift.importantDates.addedCount,
                      drift.importantDates.removedCount
                    )}</div>
                    <div class="diff-section">
                      ${formatDiffSection(drift.importantDates.diffs)}
                    </div>
                  `
                      : '<div class="no-changes">No changes detected</div>'
                  }
                </td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function generateSummarySection(
  drifts: [string, { main: DiffResult; importantDates: DiffResult }][]
): string {
  const totalEvents = drifts.length;
  const eventsWithChanges = drifts.filter(
    ([, drift]) => drift.main.hasChanges || drift.importantDates.hasChanges
  );
  const mainPageChanges = drifts.filter(
    ([, drift]) => drift.main.hasChanges
  ).length;
  const datePageChanges = drifts.filter(
    ([, drift]) => drift.importantDates.hasChanges
  ).length;

  return `
    <div style="font-family: Arial, sans-serif; background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px auto; max-width: 800px;">
      <h2 style="color: #333; margin-top: 0;">Summary</h2>
      <ul style="color: #666; line-height: 1.8;">
        <li><strong>${totalEvents}</strong> conferences monitored</li>
        <li><strong>${
          eventsWithChanges.length
        }</strong> conferences with changes detected</li>
        <li><strong>${mainPageChanges}</strong> main page changes</li>
        <li><strong>${datePageChanges}</strong> important dates page changes</li>
      </ul>
      ${
        eventsWithChanges.length > 0
          ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #dee2e6;">
          <strong style="color: #333;">Conferences with changes:</strong>
          <div style="margin-top: 8px;">
            ${eventsWithChanges
              .map(([abbrev, drift]) => {
                const changes = [];
                if (drift.main.hasChanges) changes.push("main page");
                if (drift.importantDates.hasChanges)
                  changes.push("important dates");
                return `<span style="display: inline-block; background: #e9ecef; padding: 4px 8px; margin: 4px; border-radius: 4px; font-size: 14px;">
                ${abbrev.toUpperCase()} (${changes.join(", ")})
              </span>`;
              })
              .join("")}
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;
}

export const handler = async () => {
  const storedEventInfo = await getStoredEventInfo();
  const currentEventInfo = await getCurrentEventInfo();

  const drifts: [
    string,
    {
      main: DiffResult;
      importantDates: DiffResult;
    },
  ][] = Object.entries(currentEventInfo).map(([abbrev, currentInfo]) => {
    const storedInfo = storedEventInfo[abbrev];
    return [
      abbrev,
      {
        main: diffContent(storedInfo.main, currentInfo.main),
        importantDates: diffContent(
          storedInfo.importantDates,
          currentInfo.importantDates
        ),
      },
    ];
  });

  const sesClient = new SESv2Client();

  const sendCommand: SendEmailCommand = new SendEmailCommand({
    FromEmailAddress: DRIFT_EMAIL_SENDER,
    Destination: {
      ToAddresses: [NOTIFICATION_EMAIL],
    },
    Content: {
      Simple: {
        Subject: {
          Data: `Drift Report for ${new Date().toDateString()}`,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
                <div style="max-width: 1200px; margin: 0 auto; background-color: white; padding: 20px;">
                  <h1 style="font-family: Arial, sans-serif; color: #333; text-align: center; margin-bottom: 30px;">
                    Conference Website Drift Report
                  </h1>
                  <p style="font-family: Arial, sans-serif; color: #666; text-align: center; margin-bottom: 30px;">
                    Generated on ${new Date().toLocaleString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZoneName: "short",
                    })}
                  </p>
                  ${generateSummarySection(drifts)}
                  ${toTable(drifts)}
                  <div style="font-family: Arial, sans-serif; color: #999; text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px;">
                    <p>This is an automated report from the PL Conferences drift detection system.</p>
                    <p>Changes are detected by comparing the current website content with previously stored versions.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
            Charset: "UTF-8",
          },
        },
      },
    },
  });

  await sesClient.send(sendCommand);

  // Store the current event info for the next run
  const putPromises = Object.entries(currentEventInfo).map(
    async ([abbrev, info]) => {
      if (info.main !== undefined) {
        const putMainCommand = new PutObjectCommand({
          Bucket: WEBPAGE_BUCKET_NAME,
          Key: `${abbrev}-main.html`,
          Body: info.main,
        });
        await s3Client.send(putMainCommand);
      } else {
        console.warn("No main page for ", abbrev);
      }
      if (info.importantDates !== undefined) {
        const putDatesCommand = new PutObjectCommand({
          Bucket: WEBPAGE_BUCKET_NAME,
          Key: `${abbrev}-dates.html`,
          Body: info.importantDates,
        });
        await s3Client.send(putDatesCommand);
      } else {
        console.warn("No important date url for ", abbrev);
      }
    }
  );

  await Promise.all(putPromises);
};
