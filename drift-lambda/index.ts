import { DomUtils, parseDocument } from "htmlparser2";
import { Resource } from "sst";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import diff from "fast-diff";

interface EventWebInfo {
  main?: string;
  importantDates?: string;
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
  current: string | undefined,
): diff.Diff[] {
  const f = (v: string) =>
    bind(
      DomUtils.findOne((node) => node.name === "body", parseDocument(v)),
      (v) => DomUtils.innerText(v),
    );
  const a = bind(stored, f) ?? "";
  const b = bind(current, f) ?? "";
  return diff(a, b).filter(([flag]) => flag !== 0);
}

function formatDiff([k, v]: diff.Diff): string {
  const style = `color:${k === 1 ? "green" : "red"};`;
  return `<p style=${style}>${v}</p>`;
}

async function getStoredEventInfo(): Promise<{
  [K in keyof typeof Resource.EventList.events]: EventWebInfo;
}> {
  const eventAbbrevs = Object.keys(Resource.EventList.events);
  const importantDatePages: PromiseSettledResult<
    Pick<EventWebInfo, "importantDates">
  >[] = await Promise.allSettled(
    eventAbbrevs.map(async (abbrev) => {
      const getImportantDatesCommand = new GetObjectCommand({
        Bucket: Resource.WebpageBucket.name,
        Key: `${abbrev}-dates.html`,
      });
      const res = await s3Client.send(getImportantDatesCommand);
      return {
        importantDates: await res.Body!.transformToString(),
      };
    }),
  );
  const mainPages: PromiseSettledResult<Pick<EventWebInfo, "main">>[] =
    await Promise.allSettled(
      eventAbbrevs.map(async (abbrev) => {
        const getMainCommand = new GetObjectCommand({
          Bucket: Resource.WebpageBucket.name,
          Key: `${abbrev}-main.html`,
        });
        const res = await s3Client.send(getMainCommand);
        return {
          main: await res.Body!.transformToString(),
        };
      }),
    );

  return Object.fromEntries(
    zip(mainPages, importantDatePages).map(([r1, r2], i) => [
      eventAbbrevs[i],
      {
        ...(r1.status === "fulfilled" ? r1.value : {}),
        ...(r2.status === "fulfilled" ? r2.value : {}),
      },
    ]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any;
}

async function getCurrentEventInfo(): Promise<{
  [K in keyof typeof Resource.EventList.events]: EventWebInfo;
}> {
  const es = Object.values(Resource.EventList.events);
  const mainPages: PromiseSettledResult<Pick<EventWebInfo, "main">>[] =
    await Promise.allSettled(
      es.map(async (e) => {
        if (!("url" in e)) {
          return {};
        }
        const mainPage = await fetch(e.url, {
          headers: {
            "Accept-Language": "en-US,en;q=0.9,de;q=0.8"
          }
        });
        return {
          main: await mainPage.text(),
        };
      }),
    );
  const cachedDatePages: PromiseSettledResult<
    Pick<EventWebInfo, "importantDates">
  >[] = await Promise.allSettled(
    es.map(async (e) => {
      if (!("importantDateUrl" in e)) {
        return {};
      }
      const datePage = await fetch(e.importantDateUrl);
      return {
        importantDates: await datePage.text(),
      };
    }),
  );

  return Object.fromEntries(
    zip(mainPages, cachedDatePages).map(([r1, r2], i) => [
      es[i].abbreviation,
      {
        ...(r1.status === "fulfilled" ? r1.value : {}),
        ...(r2.status === "fulfilled" ? r2.value : {}),
      },
    ]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any;
}

function toTable(
  drifts: [string, { main: diff.Diff[]; importantDates: diff.Diff[] }][],
) {
  const getUrl = (prop: string, abbrev: string): string =>
    prop in
    Resource.EventList.events[abbrev as keyof typeof Resource.EventList.events]
      ? ((
          Resource.EventList.events[
            abbrev as keyof typeof Resource.EventList.events
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ] as any
        )[prop] as string)
      : "Url not available";

  return `
    <table border="1" style="border-collapse: collapse;">
      <thead>
        <tr>
          <th>Abbreviation</th>
          <th>Main</th>
          <th>Important Dates</th>
        </tr>
      </thead>
      <tbody>
        ${drifts
          .map(([abbrev, drift]) => {
            return `
              <tr style="max-height: 100px;">
                <td style="vertical-align: top;">${abbrev}</td>
                <td style="vertical-align: top;">${
                  drift.main.length > 0
                    ? `<a href="${getUrl("url", abbrev)}">${drift.main
                        .map(formatDiff)
                        .join("\n")}</a>`
                    : "No Drift"
                }</td>
                <td style="vertical-align: top;">${
                  drift.importantDates.length > 0
                    ? `<a href="${getUrl(
                        "importantDateUrl",
                        abbrev,
                      )}">${drift.importantDates
                        .map(formatDiff)
                        .join("\n")}</a>`
                    : "No Drift"
                }</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

export const handler = async () => {
  const storedEventInfo = await getStoredEventInfo();
  const currentEventInfo = await getCurrentEventInfo();

  const drifts: [
    string,
    {
      main: diff.Diff[];
      importantDates: diff.Diff[];
    },
  ][] = Object.entries(storedEventInfo).map(([abbrev, storedInfo]) => {
    const currentInfo =
      currentEventInfo[abbrev as keyof typeof Resource.EventList.events];
    return [
      abbrev,
      {
        main: diffContent(storedInfo.main, currentInfo.main),
        importantDates: diffContent(
          storedInfo.importantDates,
          currentInfo.importantDates,
        ),
      },
    ];
  });

  const sesClient = new SESv2Client();

  const sendCommand: SendEmailCommand = new SendEmailCommand({
    FromEmailAddress: "drift@pl-conferences.com",
    Destination: {
      ToAddresses: ["cjohnson19@pm.me"],
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
              <h1>Drift Report</h1>
              ${toTable(drifts)}
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
          Bucket: Resource.WebpageBucket.name,
          Key: `${abbrev}-main.html`,
          Body: info.main,
        });
        await s3Client.send(putMainCommand);
      } else {
        console.warn("No main page for ", abbrev);
      }
      if (info.importantDates !== undefined) {
        const putDatesCommand = new PutObjectCommand({
          Bucket: Resource.WebpageBucket.name,
          Key: `${abbrev}-dates.html`,
          Body: info.importantDates,
        });
        await s3Client.send(putDatesCommand);
      } else {
        console.warn("No important date url for ", abbrev);
      }
    },
  );

  await Promise.all(putPromises);
};
