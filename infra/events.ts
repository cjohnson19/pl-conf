import { ScheduledEvent } from "@pl-conf/core";
import { format } from "date-fns";
import { exec } from "node:child_process";
import { lstat, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import * as YAML from "yaml";

function duplicates(values: {
  [k: string]: string;
}): { date: string; names: string[] }[] {
  const seen = new Map<string, string[]>();
  for (const [dateName, date] of Object.entries(values)) {
    const curr = seen.get(date);
    if (curr !== undefined) {
      seen.set(date, [...curr, dateName]);
    } else {
      seen.set(date, [dateName]);
    }
  }
  return [...seen.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([k, v]) => ({
      date: k,
      names: v,
    }));
}

async function lastUpdatedDate(fileName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`git log -1 --pretty="format:%cs" ${fileName}`, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        if (stdout === "") {
          console.warn(`No git history for ${fileName}, using current date`);
          resolve(format(new Date(), "yyyy-MM-dd"));
        } else {
          resolve(stdout);
        }
      }
    });
  });
}

async function fromYamlFile(fileName: string): Promise<ScheduledEvent> {
  const yaml = await readFile(fileName, "utf8");
  const lastUpdated = await lastUpdatedDate(fileName);
  const data = YAML.parse(yaml);
  const parseRes = ScheduledEvent.safeParse({
    ...data,
    lastUpdated,
  });
  if (parseRes.success === false) {
    throw new Error(
      parseRes.error.errors
        .map((e) => `${fileName} ${e.path}: ${e.message}`)
        .join("\n")
    );
  } else {
    const dupes = duplicates(parseRes.data.importantDates);
    if (dupes.length > 0) {
      const duplicateListings = dupes
        .map(({ date: value, names }) => `${value}: ${names.join(", ")}`)
        .join("\n");
      console.warn(
        `Found duplicated values for the important dates in ${parseRes.data.abbreviation}.\n${duplicateListings}\nDouble check these are not a copy paste mistake.`
      );
    }
    return parseRes.data;
  }
}

export async function loadEvents(): Promise<Record<string, ScheduledEvent>> {
  const dataPath = join(process.cwd(), "data");
  const conferenceYears = (await readdir(dataPath)).map(async (entry) => {
    const stats = await lstat(join(dataPath, entry));
    return stats.isDirectory() ? [entry] : [];
  });
  const conferences: ScheduledEvent[][] = await Promise.all(
    (await Promise.all(conferenceYears)).flat().map(async (yearDir) => {
      const conferenceFiles = await readdir(join(dataPath, yearDir));
      const res = await Promise.all(
        conferenceFiles.map(async (fileName) =>
          fromYamlFile(join(dataPath, yearDir, fileName))
        )
      );
      return res;
    })
  );
  return Object.fromEntries(conferences.flat().map((c) => [c.abbreviation, c]));
}
