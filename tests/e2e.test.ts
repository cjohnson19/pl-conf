import { events } from "@generated";
import { eventKey, isActive, type ScheduledEvent } from "@pl-conf/core";
import puppeteer, {
  type Browser,
  type ElementHandle,
  type Page,
} from "puppeteer";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  test as base,
  vi,
} from "vitest";

const URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

const FROZEN_NOW_ISO = "2026-06-01T12:00:00.000Z";
const FROZEN_NOW = new Date(FROZEN_NOW_ISO);

let browser: Browser;

beforeAll(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(FROZEN_NOW);
  browser = await puppeteer.launch({ headless: true });
});

afterAll(async () => {
  vi.useRealTimers();
  await browser.close();
});

const activeEvents = (): ScheduledEvent[] =>
  Object.values(events).filter(isActive);

const findFixture = (abbrev: string): ScheduledEvent => {
  const e = Object.values(events).find((x) => x.abbreviation === abbrev);
  if (!e) throw new Error(`Fixture ${abbrev} missing`);
  return e;
};

type Fixtures = {
  page: Page;
  renderedKeys: () => Promise<string[]>;
  watchButton: (key: string) => Promise<ElementHandle<Element> | null>;
  stopWatchingButton: (key: string) => Promise<ElementHandle<Element> | null>;
  clickButtonStartingWith: (label: string) => Promise<void>;
  goToAllEvents: () => Promise<void>;
};

const test = base.extend<Fixtures>({
  page: async ({}, use) => {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.evaluateOnNewDocument((iso) => {
      const Real = Date;
      const FROZEN = Real.parse(iso);
      class FakeDate extends Real {
        constructor(...args: ConstructorParameters<typeof Date> | []) {
          if (args.length === 0) {
            super(FROZEN);
          } else {
            super(...(args as ConstructorParameters<typeof Date>));
          }
        }
        static now() {
          return FROZEN;
        }
      }
      (FakeDate as unknown as { parse: typeof Real.parse }).parse = Real.parse;
      (FakeDate as unknown as { UTC: typeof Real.UTC }).UTC = Real.UTC;
      (globalThis as unknown as { Date: typeof Date }).Date =
        FakeDate as unknown as typeof Date;
    }, FROZEN_NOW_ISO);
    await page.goto(URL, { waitUntil: "networkidle2" });
    await use(page);
    await context.close();
  },
  renderedKeys: async ({ page }, use) => {
    await use(() =>
      page.$$eval("[data-event-key]", (nodes) =>
        nodes.map((n) => n.getAttribute("data-event-key") ?? "")
      )
    );
  },
  watchButton: async ({ page }, use) => {
    await use((key) =>
      page.$(`[data-event-key="${key}"] button[aria-label^="Watch "]`)
    );
  },
  stopWatchingButton: async ({ page }, use) => {
    await use((key) =>
      page.$(`[data-event-key="${key}"] button[aria-label^="Stop watching "]`)
    );
  },
  clickButtonStartingWith: async ({ page }, use) => {
    await use((label) =>
      page.evaluate((l) => {
        const btn = Array.from(document.querySelectorAll("button")).find((b) =>
          b.textContent?.trim().startsWith(l)
        );
        (btn as HTMLButtonElement | undefined)?.click();
      }, label)
    );
  },
  goToAllEvents: async ({ page, clickButtonStartingWith }, use) => {
    await use(async () => {
      await clickButtonStartingWith("All events");
      await page.waitForFunction(
        () => document.querySelectorAll("[data-event-key]").length > 0,
        { timeout: 5000 }
      );
    });
  },
});

describe.concurrent("event list", () => {
  test("auto-switches to All events when no events are watched", async ({
    page,
    renderedKeys,
  }) => {
    await page.waitForFunction(
      () => document.querySelectorAll("[data-event-key]").length > 0,
      { timeout: 5000 }
    );
    const keys = await renderedKeys();
    const expected = activeEvents().map(eventKey);
    expect(keys.length).toBe(expected.length);
    keys.forEach((k) => expect(expected).toContain(k));
  });

  test("orders events by next-deadline ascending, no-deadline last", async ({
    renderedKeys,
    goToAllEvents,
  }) => {
    await goToAllEvents();
    const keys = await renderedKeys();
    expect(keys).toEqual([
      eventKey(findFixture("MOCKB")),
      eventKey(findFixture("MOCKA")),
      eventKey(findFixture("MOCKC")),
      eventKey(findFixture("MOCKD")),
    ]);
  });
});

describe.concurrent("watching", () => {
  test("clicking the watch button toggles aria-pressed and persists to localStorage", async ({
    page,
    watchButton,
    goToAllEvents,
  }) => {
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

  test("watched events appear in the Watching view across refresh", async ({
    page,
    renderedKeys,
    watchButton,
    goToAllEvents,
  }) => {
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
    await page.waitForSelector(`[data-event-key="${key}"]`, { timeout: 5000 });
    const keys = await renderedKeys();
    expect(keys).toContain(key);
  });

  test("unwatching removes the event from the Watching view", async ({
    page,
    renderedKeys,
    watchButton,
    stopWatchingButton,
    clickButtonStartingWith,
    goToAllEvents,
  }) => {
    await goToAllEvents();
    const sample = activeEvents()[0];
    const key = eventKey(sample);

    const watch = await watchButton(key);
    await watch!.evaluate((b) => (b as HTMLButtonElement).click());
    await page.waitForSelector(
      `[data-event-key="${key}"] button[aria-pressed="true"]`,
      { timeout: 5000 }
    );

    await clickButtonStartingWith("Watching");
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

describe.concurrent("hero", () => {
  test("shows the intro hero when nothing is watched", async ({ page }) => {
    const introText = await page.evaluate(() => document.body.innerText);
    expect(introText).toMatch(/small index of/i);
  });

  test("swaps to the next-deadline hero once an event is watched", async ({
    page,
    watchButton,
    clickButtonStartingWith,
    goToAllEvents,
  }) => {
    await goToAllEvents();
    const mockb = findFixture("MOCKB");
    const key = eventKey(mockb);
    const watch = await watchButton(key);
    await watch!.evaluate((b) => (b as HTMLButtonElement).click());
    await page.waitForSelector(
      `[data-event-key="${key}"] button[aria-pressed="true"]`,
      { timeout: 5000 }
    );

    await clickButtonStartingWith("Watching");
    await page.waitForFunction(
      () =>
        /Your next deadline/i.test(document.body.innerText) ||
        /Coming up/i.test(document.body.innerText),
      { timeout: 5000 }
    );
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/MOCKB/);
    expect(body).not.toMatch(/small index of/i);
  });
});

describe.concurrent("search", () => {
  test("typing into the search pill filters the list", async ({
    page,
    renderedKeys,
    goToAllEvents,
  }) => {
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

describe.concurrent("category chips", () => {
  test("selecting Workshops only shows workshop-type events", async ({
    page,
    renderedKeys,
    clickButtonStartingWith,
  }) => {
    await clickButtonStartingWith("All events");
    await clickButtonStartingWith("Workshops");

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

describe.concurrent("submissions open view", () => {
  test("only shows events whose first deadline is still in the future", async ({
    page,
    renderedKeys,
    clickButtonStartingWith,
  }) => {
    await clickButtonStartingWith("Submissions open");
    const expectedKeys = new Set(
      [findFixture("MOCKB"), findFixture("MOCKC")].map(eventKey)
    );
    await page.waitForFunction(
      (n) => document.querySelectorAll("[data-event-key]").length === n,
      { timeout: 5000 },
      expectedKeys.size
    );
    const keys = await renderedKeys();
    expect(new Set(keys)).toEqual(expectedKeys);
  });
});

describe.concurrent("multi-round badge", () => {
  test("renders Round N / M on events with past + future deadlines across rounds", async ({
    page,
    goToAllEvents,
  }) => {
    await goToAllEvents();
    const mocka = findFixture("MOCKA");
    const key = eventKey(mocka);
    const badge = await page.$eval(`[data-event-key="${key}"]`, (row) => {
      const candidates = Array.from(row.querySelectorAll("span")).map(
        (s) => s.textContent?.trim() ?? ""
      );
      return candidates.find((t) => /^Round \d+ \/ \d+$/i.test(t)) ?? null;
    });
    expect(badge).toBe("Round 2 / 2");
  });
});

describe.concurrent("calendar menu", () => {
  test("toggling 'Include submission deadlines' regenerates the .ics with extra VEVENTs", async ({
    page,
    goToAllEvents,
  }) => {
    await goToAllEvents();
    const mockb = findFixture("MOCKB");
    const key = eventKey(mockb);

    const triggerSelector = `[data-event-key="${key}"] button[aria-label^="Add MOCKB to calendar"]`;
    await page.waitForSelector(triggerSelector, { timeout: 5000 });
    await page.click(triggerSelector);

    const icsLinkSelector = 'a[download$=".ics"]';
    await page.waitForSelector(icsLinkSelector, { timeout: 5000 });

    const fetchIcs = (selector: string) =>
      page.evaluate(async (sel) => {
        const a = document.querySelector(sel) as HTMLAnchorElement | null;
        if (!a) return null;
        const res = await fetch(a.href);
        return res.text();
      }, selector);

    const withDeadlines = await fetchIcs(icsLinkSelector);
    expect(withDeadlines).toBeTruthy();
    const withDeadlinesCount = (withDeadlines!.match(/BEGIN:VEVENT/g) ?? [])
      .length;
    expect(withDeadlinesCount).toBeGreaterThan(1);

    const firstHref = await page.$eval(
      icsLinkSelector,
      (a) => (a as HTMLAnchorElement).href
    );
    const checkboxSelector = 'input[type="checkbox"]';
    await page.waitForSelector(checkboxSelector, { timeout: 5000 });
    await page.click(checkboxSelector);

    await page.waitForFunction(
      (sel, prev) => {
        const a = document.querySelector(sel) as HTMLAnchorElement | null;
        return !!a && a.href !== prev;
      },
      { timeout: 5000 },
      icsLinkSelector,
      firstHref
    );

    const eventsOnly = await fetchIcs(icsLinkSelector);
    expect(eventsOnly).toBeTruthy();
    const eventsOnlyCount = (eventsOnly!.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(eventsOnlyCount).toBe(1);
    expect(eventsOnlyCount).toBeLessThan(withDeadlinesCount);
  });

  test("'Include submission deadlines' persists to localStorage and is restored across reloads", async ({
    page,
    goToAllEvents,
  }) => {
    await goToAllEvents();
    const mockb = findFixture("MOCKB");
    const key = eventKey(mockb);

    const triggerSelector = `[data-event-key="${key}"] button[aria-label^="Add MOCKB to calendar"]`;
    const checkboxSelector = 'input[type="checkbox"]';

    await page.waitForSelector(triggerSelector, { timeout: 5000 });
    await page.click(triggerSelector);
    await page.waitForSelector(checkboxSelector, { timeout: 5000 });

    const initialChecked = await page.$eval(
      checkboxSelector,
      (el) => (el as HTMLInputElement).checked
    );
    expect(initialChecked).toBe(true);

    await page.click(checkboxSelector);
    await page.waitForFunction(
      () => {
        const stored = JSON.parse(localStorage.getItem("userPrefsV2") ?? "{}");
        return stored?.display?.includeCalendarDeadlines === false;
      },
      { timeout: 5000 }
    );

    await page.reload({ waitUntil: "networkidle2" });
    await goToAllEvents();
    await page.waitForSelector(triggerSelector, { timeout: 5000 });
    await page.click(triggerSelector);
    await page.waitForSelector(checkboxSelector, { timeout: 5000 });

    const restoredChecked = await page.$eval(
      checkboxSelector,
      (el) => (el as HTMLInputElement).checked
    );
    expect(restoredChecked).toBe(false);
  });

  test("toggle state is shared between the calendar menu and the mobile action sheet", async ({
    page,
    goToAllEvents,
  }) => {
    await goToAllEvents();
    const mockb = findFixture("MOCKB");
    const key = eventKey(mockb);

    const calendarTrigger = `[data-event-key="${key}"] button[aria-label^="Add MOCKB to calendar"]`;
    const checkboxSelector = 'input[type="checkbox"]';

    await page.waitForSelector(calendarTrigger, { timeout: 5000 });
    await page.click(calendarTrigger);
    await page.waitForSelector(checkboxSelector, { timeout: 5000 });
    await page.click(checkboxSelector);
    await page.waitForFunction(
      () => {
        const stored = JSON.parse(localStorage.getItem("userPrefsV2") ?? "{}");
        return stored?.display?.includeCalendarDeadlines === false;
      },
      { timeout: 5000 }
    );

    await page.keyboard.press("Escape");
    await page.waitForFunction(
      (sel) => !document.querySelector(sel),
      { timeout: 5000 },
      checkboxSelector
    );

    await page.setViewport({ width: 375, height: 800 });
    const sheetTrigger = `[data-event-key="${key}"] button[aria-label^="Actions for MOCKB"]`;
    await page.waitForSelector(sheetTrigger, { timeout: 5000 });
    await page.click(sheetTrigger);
    await page.waitForSelector(checkboxSelector, { timeout: 5000 });

    const sheetChecked = await page.$eval(
      checkboxSelector,
      (el) => (el as HTMLInputElement).checked
    );
    expect(sheetChecked).toBe(false);

    await page.click(checkboxSelector);
    await page.waitForFunction(
      () => {
        const stored = JSON.parse(localStorage.getItem("userPrefsV2") ?? "{}");
        return stored?.display?.includeCalendarDeadlines === true;
      },
      { timeout: 5000 }
    );

    await page.keyboard.press("Escape");
    await page.waitForFunction(
      (sel) => !document.querySelector(sel),
      { timeout: 5000 },
      checkboxSelector
    );

    await page.setViewport({ width: 1280, height: 800 });
    await page.waitForSelector(calendarTrigger, { timeout: 5000 });
    await page.click(calendarTrigger);
    await page.waitForSelector(checkboxSelector, { timeout: 5000 });

    const menuChecked = await page.$eval(
      checkboxSelector,
      (el) => (el as HTMLInputElement).checked
    );
    expect(menuChecked).toBe(true);
  });
});

describe.concurrent("mobile layout", () => {
  test("at 375px the row exposes only the action sheet trigger", async ({
    page,
    goToAllEvents,
  }) => {
    await page.setViewport({ width: 375, height: 800 });
    await goToAllEvents();
    const mockb = findFixture("MOCKB");
    const key = eventKey(mockb);

    const isVisible = (selector: string) =>
      page.$eval(`[data-event-key="${key}"] ${selector}`, (el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        const style = window.getComputedStyle(el as HTMLElement);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none"
        );
      });

    expect(await isVisible(`button[aria-label^="Actions for MOCKB"]`)).toBe(
      true
    );
    expect(await isVisible(`button[aria-label^="Watch "]`)).toBe(false);
    expect(await isVisible(`button[aria-label^="Add MOCKB to calendar"]`)).toBe(
      false
    );

    const trigger = await page.$(
      `[data-event-key="${key}"] button[aria-label^="Actions for MOCKB"]`
    );
    await trigger!.evaluate((b) => (b as HTMLButtonElement).click());
    await page.waitForFunction(
      () => /Watch this event/i.test(document.body.innerText),
      { timeout: 5000 }
    );
  });
});
