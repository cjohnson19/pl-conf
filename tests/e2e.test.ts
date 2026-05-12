import { events } from "@generated";
import { eventKey, isActive, type ScheduledEvent } from "@pl-conf/core";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await puppeteer.launch({ headless: true });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
});

beforeEach(async () => {
  await page.goto(URL, { waitUntil: "networkidle2" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle2" });
});

afterAll(async () => {
  await browser.close();
});

const activeEvents = (): ScheduledEvent[] =>
  Object.values(events).filter(isActive);

const renderedKeys = (): Promise<string[]> =>
  page.$$eval("[data-event-key]", (nodes) =>
    nodes.map((n) => n.getAttribute("data-event-key") ?? "")
  );

const watchButton = (key: string) =>
  page.$(`[data-event-key="${key}"] button[aria-label^="Watch "]`);

const stopWatchingButton = (key: string) =>
  page.$(`[data-event-key="${key}"] button[aria-label^="Stop watching "]`);

const clickViewTab = async (
  label: "Watching" | "All events" | "Submissions open"
) => {
  await page.evaluate((l) => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.trim().startsWith(l)
    );
    (btn as HTMLButtonElement | undefined)?.click();
  }, label);
};

const clickCategoryChip = async (label: string) => {
  await page.evaluate((l) => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.trim().startsWith(l)
    );
    (btn as HTMLButtonElement | undefined)?.click();
  }, label);
};

const goToAllEvents = async () => {
  await clickViewTab("All events");
  await page.waitForFunction(
    () => document.querySelectorAll("[data-event-key]").length > 0,
    { timeout: 5000 }
  );
};

describe("event list", () => {
  it("defaults to the Watching view, which is empty without prefs", async () => {
    const keys = await renderedKeys();
    expect(keys.length).toBe(0);
  });

  it("switching to All events shows every active event", async () => {
    await clickViewTab("All events");
    await page.waitForFunction(
      () => document.querySelectorAll("[data-event-key]").length > 0,
      { timeout: 5000 }
    );
    const keys = await renderedKeys();
    const expected = activeEvents().map(eventKey);
    expect(keys.length).toBe(expected.length);
    keys.forEach((k) => expect(expected).toContain(k));
  });
});

describe("watching", () => {
  it("clicking the watch button toggles aria-pressed and persists to localStorage", async () => {
    await goToAllEvents();
    const sample = activeEvents()[0];
    expect(sample).toBeDefined();
    const key = eventKey(sample);

    const watch = await watchButton(key);
    expect(watch).not.toBeNull();
    await watch!.evaluate((b) => (b as HTMLButtonElement).click());

    await page.waitForSelector(
      `[data-event-key="${key}"] button[aria-pressed="true"]`,
      { timeout: 5000 }
    );

    const store = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("userPrefsV2") ?? "{}")
    );
    expect(store?.eventPrefs?.[key]?.favorite).toBe(true);
  });

  it("watched events appear in the Watching view across refresh", async () => {
    await goToAllEvents();
    const sample = activeEvents()[0];
    const key = eventKey(sample);

    const watch = await watchButton(key);
    await watch!.evaluate((b) => (b as HTMLButtonElement).click());
    await page.waitForSelector(
      `[data-event-key="${key}"] button[aria-pressed="true"]`,
      { timeout: 5000 }
    );

    await page.reload({ waitUntil: "networkidle2" });
    // Watching is the default view, so the watched event should be present.
    await page.waitForSelector(`[data-event-key="${key}"]`, { timeout: 5000 });
    const keys = await renderedKeys();
    expect(keys).toContain(key);
  });

  it("unwatching removes the event from the Watching view", async () => {
    await goToAllEvents();
    const sample = activeEvents()[0];
    const key = eventKey(sample);

    const watch = await watchButton(key);
    await watch!.evaluate((b) => (b as HTMLButtonElement).click());
    await page.waitForSelector(
      `[data-event-key="${key}"] button[aria-pressed="true"]`,
      { timeout: 5000 }
    );

    await clickViewTab("Watching");
    await page.waitForSelector(`[data-event-key="${key}"]`, { timeout: 5000 });

    const unwatch = await stopWatchingButton(key);
    expect(unwatch).not.toBeNull();
    await unwatch!.evaluate((b) => (b as HTMLButtonElement).click());

    await page.waitForFunction(
      (k) => !document.querySelector(`[data-event-key="${k}"]`),
      { timeout: 5000 },
      key
    );
    const keys = await renderedKeys();
    expect(keys).not.toContain(key);
  });
});

describe("search", () => {
  it("typing into the search pill filters the list", async () => {
    await goToAllEvents();
    const sample = activeEvents()[0];
    const term = sample.abbreviation;

    const input = await page.$('input[placeholder="Search events…"]');
    expect(input).not.toBeNull();
    await input!.click({ clickCount: 3 });
    await input!.type(term);

    await page.waitForFunction(
      (k) => !!document.querySelector(`[data-event-key="${k}"]`),
      { timeout: 5000 },
      eventKey(sample)
    );

    const keys = await renderedKeys();
    expect(keys).toContain(eventKey(sample));
    expect(keys.length).toBeLessThan(activeEvents().length);
  });
});

describe("category chips", () => {
  it("selecting Workshops only shows workshop-type events", async () => {
    await clickViewTab("All events");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.trim().startsWith("Workshops")
      );
      (btn as HTMLButtonElement | undefined)?.click();
    });

    const expectedKeys = new Set(
      activeEvents()
        .filter((e) => e.type === "workshop")
        .map(eventKey)
    );

    await page.waitForFunction(
      (n) => document.querySelectorAll("[data-event-key]").length === n,
      { timeout: 5000 },
      expectedKeys.size
    );

    const keys = await renderedKeys();
    expect(keys.length).toBe(expectedKeys.size);
    keys.forEach((k) => expect(expectedKeys.has(k)).toBe(true));
  });
});
