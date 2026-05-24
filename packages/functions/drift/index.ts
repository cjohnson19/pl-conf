import { createHash } from "node:crypto";
import { DomUtils, parseDocument } from "htmlparser2";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { eventKey, isActive } from "@pl-conf/core";
import diff from "fast-diff";
import { events } from "@pl-conf/data";

interface DiffResult {
  diffs: diff.Diff[];
  addedCount: number;
  removedCount: number;
  hasChanges: boolean;
}

function groupBy<T, K>(f: (x: T) => K, l: T[]): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of l) {
    const key = f(item);
    const entry = map.get(key);
    if (entry !== undefined) {
      entry.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

function bind<T, U>(v: T | undefined | null, f: (x: T) => U): U | undefined {
  return v === undefined || v === null ? undefined : f(v);
}

type SourceType = "main" | "importantDates";

interface UrlRef {
  key: string;
  sourceType: SourceType;
}

interface UrlTask {
  normalizedUrl: string;
  displayUrl: string;
  storageKey: string;
  refs: UrlRef[];
}

interface UrlGroup extends UrlTask {
  current?: string;
  stored?: string;
  diff: DiffResult;
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.username = "";
    u.password = "";
    u.host = u.host.toLowerCase();
    if (u.pathname.length > 1) {
      u.pathname = u.pathname.replace(/\/+$/, "");
    }
    return u.toString();
  } catch {
    return url;
  }
}

function urlStorageKey(normalizedUrl: string): string {
  const hash = createHash("sha256")
    .update(normalizedUrl)
    .digest("hex")
    .slice(0, 16);
  return `url-${hash}.html`;
}

function collectUrlTasks(): UrlTask[] {
  const active = Object.values(events).filter(isActive);
  const entries = active.flatMap((e) => {
    const key = eventKey(e);
    const fromMain =
      e.url !== undefined
        ? [
            {
              normalized: normalizeUrl(e.url),
              original: e.url,
              ref: { key, sourceType: "main" as const },
            },
          ]
        : [];
    const fromDates =
      e.importantDateUrl !== undefined
        ? [
            {
              normalized: normalizeUrl(e.importantDateUrl),
              original: e.importantDateUrl,
              ref: { key, sourceType: "importantDates" as const },
            },
          ]
        : [];
    return [...fromMain, ...fromDates];
  });

  const grouped = groupBy((e) => e.normalized, entries);
  return Array.from(grouped.entries()).map(([normalizedUrl, group]) => ({
    normalizedUrl,
    displayUrl: group[0].original,
    storageKey: urlStorageKey(normalizedUrl),
    refs: group.map((g) => g.ref),
  }));
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

const DRIFT_SNAPSHOTS_BUCKET_NAME = process.env.DRIFT_SNAPSHOTS_BUCKET_NAME!;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL!;
const DRIFT_EMAIL_SENDER =
  process.env.DRIFT_EMAIL_SENDER || "drift-production@pl-conferences.com";

async function fetchStored(storageKey: string): Promise<string | undefined> {
  try {
    const res = await s3Client.send(
      new GetObjectCommand({
        Bucket: DRIFT_SNAPSHOTS_BUCKET_NAME,
        Key: storageKey,
      })
    );
    return await res.Body?.transformToString();
  } catch {
    return undefined;
  }
}

async function fetchCurrent(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, {
      headers: {
        "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
      },
    });
    return await res.text();
  } catch {
    return undefined;
  }
}

async function processUrl(task: UrlTask): Promise<UrlGroup> {
  const [storedRes, currentRes] = await Promise.allSettled([
    fetchStored(task.storageKey),
    fetchCurrent(task.displayUrl),
  ]);
  const stored = storedRes.status === "fulfilled" ? storedRes.value : undefined;
  const current =
    currentRes.status === "fulfilled" ? currentRes.value : undefined;
  return {
    ...task,
    stored,
    current,
    diff: diffContent(stored, current),
  };
}

function renderUrlGroup(group: UrlGroup): string {
  const refList = group.refs
    .map((ref) => {
      const event = events[ref.key];
      const abbrev = (event?.abbreviation || ref.key).toUpperCase();
      const eventName = event?.name || ref.key;
      const sourceLabel =
        ref.sourceType === "main" ? "main" : "important dates";
      return `<span class="ref-chip" title="${escapeHtml(eventName)}">
        <span class="ref-abbrev">${escapeHtml(abbrev)}</span>
        <span class="ref-source">${sourceLabel}</span>
      </span>`;
    })
    .join("");

  return `
    <div class="url-block">
      <div class="url-header">
        <a href="${escapeHtml(
          group.displayUrl
        )}" class="url-link" target="_blank">${escapeHtml(group.displayUrl)}</a>
        <div class="change-summary">${formatDiffSummary(
          group.diff.addedCount,
          group.diff.removedCount
        )}</div>
      </div>
      <div class="ref-list">${refList}</div>
      <div class="diff-section">${formatDiffSection(group.diff.diffs)}</div>
    </div>
  `;
}

function toTable(groups: UrlGroup[]) {
  const withChanges = groups.filter((g) => g.diff.hasChanges);

  if (withChanges.length === 0) {
    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; color: #666;">
        <h2>No changes detected in any monitored events</h2>
        <p>All conference websites remain unchanged since the last check.</p>
      </div>
    `;
  }

  return `
    <style>
      .drift-groups {
        font-family: Arial, sans-serif;
        max-width: 1200px;
        margin: 20px auto;
      }
      .url-block {
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }
      .url-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
        flex-wrap: wrap;
        border-bottom: 1px solid #eee;
        padding-bottom: 8px;
        margin-bottom: 8px;
      }
      .url-link {
        color: #0066cc;
        text-decoration: none;
        font-weight: 600;
        font-size: 14px;
        word-break: break-all;
      }
      .url-link:hover {
        text-decoration: underline;
      }
      .change-summary {
        font-size: 12px;
        color: #666;
        white-space: nowrap;
      }
      .ref-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 10px;
      }
      .ref-chip {
        display: inline-flex;
        align-items: baseline;
        gap: 4px;
        background: #eef3fb;
        color: #0b3d91;
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 12px;
      }
      .ref-abbrev {
        font-weight: 600;
      }
      .ref-source {
        color: #555;
        font-size: 11px;
      }
      .diff-section {
        margin-top: 4px;
      }
    </style>

    <div class="drift-groups">
      ${withChanges.map(renderUrlGroup).join("")}
    </div>
  `;
}

function generateSummarySection(groups: UrlGroup[]): string {
  const totalEvents = new Set(groups.flatMap((g) => g.refs.map((r) => r.key)))
    .size;
  const totalUrls = groups.length;
  const urlsWithChanges = groups.filter((g) => g.diff.hasChanges);
  const affectedKeys = new Set(
    urlsWithChanges.flatMap((g) => g.refs.map((r) => r.key))
  );

  return `
    <div style="font-family: Arial, sans-serif; background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px auto; max-width: 800px;">
      <h2 style="color: #333; margin-top: 0;">Summary</h2>
      <ul style="color: #666; line-height: 1.8;">
        <li><strong>${totalEvents}</strong> conferences monitored</li>
        <li><strong>${totalUrls}</strong> unique pages tracked</li>
        <li><strong>${urlsWithChanges.length}</strong> pages with changes</li>
        <li><strong>${affectedKeys.size}</strong> conferences affected</li>
      </ul>
      ${
        affectedKeys.size > 0
          ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #dee2e6;">
          <strong style="color: #333;">Affected conferences:</strong>
          <div style="margin-top: 8px;">
            ${Array.from(affectedKeys)
              .map((key) => {
                const displayAbbrev = events[key]?.abbreviation || key;
                return `<span style="display: inline-block; background: #e9ecef; padding: 4px 8px; margin: 4px; border-radius: 4px; font-size: 14px;">
                ${escapeHtml(displayAbbrev.toUpperCase())}
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
  const tasks = collectUrlTasks();
  const results = await Promise.all(tasks.map(processUrl));
  const urlGroups = results.slice().sort((a, b) => {
    const aChanges = a.diff.addedCount + a.diff.removedCount;
    const bChanges = b.diff.addedCount + b.diff.removedCount;
    if (aChanges !== bChanges) return bChanges - aChanges;
    return a.normalizedUrl.localeCompare(b.normalizedUrl);
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
                  ${generateSummarySection(urlGroups)}
                  ${toTable(urlGroups)}
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

  await Promise.all(
    urlGroups.map(async (group) => {
      if (group.current === undefined) {
        console.warn("No current content for ", group.displayUrl);
        return;
      }
      await s3Client.send(
        new PutObjectCommand({
          Bucket: DRIFT_SNAPSHOTS_BUCKET_NAME,
          Key: group.storageKey,
          Body: group.current,
        })
      );
    })
  );
};
