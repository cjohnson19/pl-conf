import { events } from "@pl-conf/data";
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

type StorageSeed = {
  local?: Record<string, unknown>;
  session?: Record<string, unknown>;
  params?: Record<string, string>;
};

type Fixtures = {
  page: Page;
  renderedKeys: () => Promise<string[]>;
  starButton: (key: string) => Promise<ElementHandle<Element> | null>;
  unstarButton: (key: string) => Promise<ElementHandle<Element> | null>;
  clickButtonStartingWith: (label: string) => Promise<void>;
  goToAllEvents: () => Promise<void>;
  seedStorage: (seed: StorageSeed) => Promise<void>;
  waitForSettled: () => Promise<void>;
};

const test = base.extend<Fixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: vitest fixture signature requires destructuring the fixtures arg even when unused
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
        nodes
          .filter((n) => (n as HTMLElement).offsetParent !== null)
          .map((n) => n.getAttribute("data-event-key") ?? "")
      )
    );
  },
  starButton: async ({ page }, use) => {
    await use((key) =>
      page.$(`[data-event-key="${key}"] button[aria-label^="Star "]`)
    );
  },
  unstarButton: async ({ page }, use) => {
    await use((key) =>
      page.$(`[data-event-key="${key}"] button[aria-label^="Unstar "]`)
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
  seedStorage: async ({ page }, use) => {
    await use(async (seed) => {
      await page.evaluate((s: StorageSeed) => {
        if (s.local) {
          for (const [k, v] of Object.entries(s.local)) {
            localStorage.setItem(
              k,
              typeof v === "string" ? v : JSON.stringify(v)
            );
          }
        }
        if (s.session) {
          for (const [k, v] of Object.entries(s.session)) {
            sessionStorage.setItem(
              k,
              typeof v === "string" ? v : JSON.stringify(v)
            );
          }
        }
      }, seed);
      if (seed.params) {
        const qs = new URLSearchParams(seed.params).toString();
        await page.goto(`${URL}${qs ? `?${qs}` : ""}`, {
          waitUntil: "networkidle2",
        });
      } else {
        await page.reload({ waitUntil: "networkidle2" });
      }
    });
  },
  waitForSettled: async ({ page }, use) => {
    await use(async () => {
      // EventListContainer sets data-pl-conf-hydrated on the html element
      // in a mount-time effect, so this attribute appears exactly once
      // React has hydrated. A small post-hydration delay lets follow-up
      // effects (localStorage prefs load, hero pickHero, hero transition)
      // commit before assertions run.
      await page.waitForFunction(
        () => document.documentElement.dataset.plConfHydrated === "1",
        { timeout: 5000 }
      );
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
  },
});

describe.concurrent("event list", () => {
  test("auto-switches to All events when no events are starred", async ({
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
    keys.forEach((k) => {
      expect(expected).toContain(k);
    });
  });

  test("orders events by next-deadline ascending, no-deadline last", async ({
    renderedKeys,
    goToAllEvents,
  }) => {
    await goToAllEvents();
    const keys = await renderedKeys();
    expect(keys).toEqual([
      eventKey(findFixture("MOCKE")),
      eventKey(findFixture("MOCKB")),
      eventKey(findFixture("MOCKA")),
      eventKey(findFixture("MOCKC")),
      eventKey(findFixture("MOCKD")),
    ]);
  });
});

describe("starring", () => {
  test("clicking the star button toggles aria-pressed and persists to localStorage", async ({
    page,
    starButton,
    goToAllEvents,
  }) => {
    await goToAllEvents();
    const sample = activeEvents()[0];
    expect(sample).toBeDefined();
    const key = eventKey(sample);

    const star = await starButton(key);
    expect(star).not.toBeNull();
    await star?.evaluate((b) => (b as HTMLButtonElement).click());

    await page.waitForSelector(
      `[data-event-key="${key}"] button[aria-pressed="true"]`,
      { timeout: 5000 }
    );

    const store = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("userPrefsV2") ?? "{}")
    );
    expect(store?.eventPrefs?.[key]?.favorite).toBe(true);
  });

  test("starred events appear in the Starred view across refresh", async ({
    page,
    renderedKeys,
    starButton,
    goToAllEvents,
  }) => {
    await goToAllEvents();
    const sample = activeEvents()[0];
    const key = eventKey(sample);

    const star = await starButton(key);
    await star?.evaluate((b) => (b as HTMLButtonElement).click());
    await page.waitForSelector(
      `[data-event-key="${key}"] button[aria-pressed="true"]`,
      { timeout: 5000 }
    );

    await page.reload({ waitUntil: "networkidle2" });
    await page.waitForSelector(`[data-event-key="${key}"]`, { timeout: 5000 });
    const keys = await renderedKeys();
    expect(keys).toContain(key);
  });

  test("unstarring removes the event from the Starred view", async ({
    page,
    renderedKeys,
    starButton,
    unstarButton,
    clickButtonStartingWith,
    goToAllEvents,
  }) => {
    await goToAllEvents();
    const sample = activeEvents()[0];
    const key = eventKey(sample);

    const star = await starButton(key);
    await star?.evaluate((b) => (b as HTMLButtonElement).click());
    await page.waitForSelector(
      `[data-event-key="${key}"] button[aria-pressed="true"]`,
      { timeout: 5000 }
    );

    await clickButtonStartingWith("Starred");
    await page.waitForSelector(`[data-event-key="${key}"]`, { timeout: 5000 });

    const unstar = await unstarButton(key);
    expect(unstar).not.toBeNull();
    await unstar?.evaluate((b) => (b as HTMLButtonElement).click());

    await page.waitForFunction(
      (k) => {
        const el = document.querySelector(
          `[data-event-key="${k}"]`
        ) as HTMLElement | null;
        return !el || el.offsetParent === null;
      },
      { timeout: 5000 },
      key
    );
    const keys = await renderedKeys();
    expect(keys).not.toContain(key);
  });
});

describe.concurrent("hero", () => {
  test("renders no hero when nothing is starred", async ({ page }) => {
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).not.toMatch(/your next deadline/i);
    expect(body).not.toMatch(/coming up/i);
  });

  test("opens the help popover with the site explainer", async ({ page }) => {
    const trigger = await page.waitForSelector(
      'button[aria-label="How this site works"]',
      { timeout: 5000 }
    );
    await trigger?.evaluate((b) => (b as HTMLButtonElement).click());
    await page.waitForFunction(
      () => /small index of/i.test(document.body.innerText),
      { timeout: 5000 }
    );
  });

  test("swaps to the next-deadline hero once an event is starred", async ({
    page,
    starButton,
    clickButtonStartingWith,
    goToAllEvents,
  }) => {
    await goToAllEvents();
    const mockb = findFixture("MOCKB");
    const key = eventKey(mockb);
    const star = await starButton(key);
    await star?.evaluate((b) => (b as HTMLButtonElement).click());
    await page.waitForSelector(
      `[data-event-key="${key}"] button[aria-pressed="true"]`,
      { timeout: 5000 }
    );

    await clickButtonStartingWith("Starred");
    await page.waitForFunction(
      () =>
        /Your next deadline/i.test(document.body.innerText) ||
        /Coming up/i.test(document.body.innerText),
      { timeout: 5000 }
    );
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/MOCKB/);
  });

  test("renders minute-grain countdown when a deadline is on today's calendar date", async ({
    page,
    starButton,
    clickButtonStartingWith,
    goToAllEvents,
  }) => {
    // MOCKE has paper: 2026-06-01, which is FROZEN_NOW's local calendar date.
    // humanCountdown's `days <= 0` branch fires whenever the deadline's local
    // calendar date is today or earlier — even if the AoE-clock-time-remaining
    // is still over 24 hours (e.g. AoE-end-of-June-1 viewed from CDT is
    // June 2 06:59 CDT, so at June 1 00:01 CDT we're 30h+ from AoE but the
    // text is already minute-grain). Pinning the rendered shape here forces
    // useNowTick to keep matching: if it ever falls back to a daily tick for
    // this case, the displayed text would drift stale instead of decrementing.
    await goToAllEvents();
    const mocke = findFixture("MOCKE");
    const key = eventKey(mocke);
    const star = await starButton(key);
    expect(star).not.toBeNull();
    await star?.evaluate((b) => (b as HTMLButtonElement).click());
    await page.waitForSelector(
      `[data-event-key="${key}"] button[aria-pressed="true"]`,
      { timeout: 5000 }
    );

    await clickButtonStartingWith("Starred");
    await page.waitForFunction(() => /MOCKE/.test(document.body.innerText), {
      timeout: 5000,
    });
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/MOCKE/);
    expect(body).toMatch(/in \d+ hours? \d+ minutes?/);
    expect(body).not.toMatch(/in \d+ days?/);
    expect(body).not.toMatch(/tomorrow/i);
  });
});

describe("search", () => {
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
    await input?.click({ clickCount: 3 });
    await input?.type(term);

    const fullCount = activeEvents().length;
    await page.waitForFunction(
      (n) =>
        Array.from(document.querySelectorAll("[data-event-key]")).filter(
          (el) => (el as HTMLElement).offsetParent !== null
        ).length < n,
      { timeout: 5000 },
      fullCount
    );

    const keys = await renderedKeys();
    expect(keys).toContain(eventKey(sample));
    expect(keys.length).toBeLessThan(fullCount);
  });
});

describe("category chips", () => {
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
    keys.forEach((k) => {
      expect(expectedKeys.has(k)).toBe(true);
    });
  });
});

describe.concurrent("tags", () => {
  const tagsTriggerSelector = 'button[aria-label="Filter by tags"]';
  const popoverSelector = '[role="dialog"]';

  test("renders tag pills inside the title row next to the abbreviation", async ({
    page,
    goToAllEvents,
  }) => {
    await goToAllEvents();
    const mocka = findFixture("MOCKA");
    const key = eventKey(mocka);

    const result = await page.$eval(
      `[data-event-key="${key}"]`,
      (row, expected) => {
        const tagButtons = Array.from(
          row.querySelectorAll("button[data-tag]")
        ) as HTMLButtonElement[];
        const tags = tagButtons.map((b) => b.dataset.tag ?? "");
        const abbrevSpan = Array.from(row.querySelectorAll("span")).find(
          (s) => s.textContent?.trim() === (expected as string)
        );
        const titleContainer = abbrevSpan?.parentElement ?? null;
        const sharesContainer =
          titleContainer !== null &&
          tagButtons.length > 0 &&
          tagButtons.every((b) => titleContainer.contains(b));
        return { tags, sharesContainer };
      },
      mocka.abbreviation
    );

    expect(result.tags).toEqual(["types", "verification"]);
    expect(result.sharesContainer).toBe(true);
  });

  test("opens the popover and shows a checkbox row per canonical tag", async ({
    page,
    goToAllEvents,
  }) => {
    await goToAllEvents();
    await page.click(tagsTriggerSelector);
    await page.waitForSelector(popoverSelector, { timeout: 5000 });

    const tagsInPopover = await page.$$eval(
      `${popoverSelector} button[data-tag]`,
      (btns) => btns.map((b) => (b as HTMLButtonElement).dataset.tag ?? "")
    );
    expect(tagsInPopover).toContain("types");
    expect(tagsInPopover).toContain("verification");
    expect(tagsInPopover).toContain("semantics");
    expect(tagsInPopover.length).toBeGreaterThan(10);
  });

  test("selecting one tag narrows the list to events with that tag", async ({
    page,
    renderedKeys,
    goToAllEvents,
  }) => {
    await goToAllEvents();
    await page.click(tagsTriggerSelector);
    await page.waitForSelector(`${popoverSelector} button[data-tag="types"]`, {
      timeout: 5000,
    });
    await page.click(`${popoverSelector} button[data-tag="types"]`);

    const expectedKeys = new Set(
      [findFixture("MOCKA"), findFixture("MOCKC")].map(eventKey)
    );
    await page.waitForFunction(
      (n) => document.querySelectorAll("[data-event-key]").length === n,
      { timeout: 5000 },
      expectedKeys.size
    );
    expect(new Set(await renderedKeys())).toEqual(expectedKeys);
  });

  test("selecting multiple tags applies OR semantics", async ({
    page,
    renderedKeys,
    goToAllEvents,
  }) => {
    await goToAllEvents();
    await page.click(tagsTriggerSelector);
    await page.waitForSelector(`${popoverSelector} button[data-tag="types"]`, {
      timeout: 5000,
    });
    await page.click(`${popoverSelector} button[data-tag="types"]`);
    await page.click(`${popoverSelector} button[data-tag="semantics"]`);

    const expectedKeys = new Set(
      [findFixture("MOCKA"), findFixture("MOCKB"), findFixture("MOCKC")].map(
        eventKey
      )
    );
    await page.waitForFunction(
      (n) => document.querySelectorAll("[data-event-key]").length === n,
      { timeout: 5000 },
      expectedKeys.size
    );
    expect(new Set(await renderedKeys())).toEqual(expectedKeys);
  });

  test("Clear resets active tags and restores the full list", async ({
    page,
    renderedKeys,
    goToAllEvents,
  }) => {
    await goToAllEvents();
    await page.click(tagsTriggerSelector);
    await page.waitForSelector(`${popoverSelector} button[data-tag="types"]`, {
      timeout: 5000,
    });
    await page.click(`${popoverSelector} button[data-tag="types"]`);
    await page.waitForFunction(
      () => document.querySelectorAll("[data-event-key]").length === 2,
      { timeout: 5000 }
    );

    await page.click(`${popoverSelector} button:not([data-tag])`);
    await page.waitForFunction(
      (n) => document.querySelectorAll("[data-event-key]").length === n,
      { timeout: 5000 },
      activeEvents().length
    );
    const keys = await renderedKeys();
    expect(keys.length).toBe(activeEvents().length);
  });

  test("clicking a tag pill on a row toggles that tag into the filter", async ({
    page,
    renderedKeys,
    goToAllEvents,
  }) => {
    await goToAllEvents();
    const mocka = findFixture("MOCKA");
    const key = eventKey(mocka);

    await page.click(
      `[data-event-key="${key}"] button[data-tag="verification"]`
    );

    await page.waitForFunction(
      () => document.querySelectorAll("[data-event-key]").length === 1,
      { timeout: 5000 }
    );
    expect(await renderedKeys()).toEqual([key]);
  });
});

describe("submissions open view", () => {
  test("only shows events whose first deadline is still in the future", async ({
    page,
    renderedKeys,
    clickButtonStartingWith,
  }) => {
    await clickButtonStartingWith("Submissions open");
    const expectedKeys = new Set(
      [findFixture("MOCKB"), findFixture("MOCKC"), findFixture("MOCKE")].map(
        eventKey
      )
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

describe("calendar menu", () => {
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
    const withDeadlinesCount = (withDeadlines?.match(/BEGIN:VEVENT/g) ?? [])
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
    const eventsOnlyCount = (eventsOnly?.match(/BEGIN:VEVENT/g) ?? []).length;
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

describe("mobile layout", () => {
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
    expect(await isVisible(`button[aria-label^="Star "]`)).toBe(false);
    expect(await isVisible(`button[aria-label^="Add MOCKB to calendar"]`)).toBe(
      false
    );

    const trigger = await page.$(
      `[data-event-key="${key}"] button[aria-label^="Actions for MOCKB"]`
    );
    await trigger?.evaluate((b) => (b as HTMLButtonElement).click());
    await page.waitForFunction(
      () => /Star this event/i.test(document.body.innerText),
      { timeout: 5000 }
    );
  });
});

describe.concurrent("persistence settle", () => {
  // Storage keys mirror what the app uses today. Any refactor that moves
  // initial-load reads into a coalesced provider must preserve these keys
  // and their on-the-wire shapes — otherwise returning users lose state.
  const PREFS_KEY = "userPrefsV2";
  const COLLAPSED_KEY = "collapsedDateGroups";

  const prefs = (display: Record<string, unknown>, eventPrefs = {}) => ({
    eventPrefs,
    display: {
      includeCalendarDeadlines: true,
      deadlineHeroDismissed: false,
      collapseHintDismissed: false,
      permanentlyHiddenEventHeroes: [],
      layout: "list",
      ...display,
    },
  });

  const starred = (key: string) => ({ [key]: { favorite: true } });

  test("empty storage settles to defaults: All events, list layout, no hero", async ({
    page,
    waitForSettled,
    renderedKeys,
  }) => {
    await waitForSettled();
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).not.toMatch(/your next deadline/i);

    const keys = await renderedKeys();
    expect(keys.length).toBe(activeEvents().length);

    const listPressed = await page.$eval(
      'button[aria-label="List view"]',
      (el) => (el as HTMLButtonElement).getAttribute("aria-pressed")
    );
    expect(listPressed).toBe("true");
  });

  test("view=all (default) is honored even when the user has starred events", async ({
    seedStorage,
    waitForSettled,
    renderedKeys,
  }) => {
    const key = eventKey(findFixture("MOCKB"));
    await seedStorage({
      local: { [PREFS_KEY]: prefs({}, starred(key)) },
    });
    await waitForSettled();
    const keys = await renderedKeys();
    expect(keys.length).toBe(activeEvents().length);
    expect(keys).toContain(key);
  });

  test("?view=starred is honored even when nothing is starred (empty state)", async ({
    page,
    seedStorage,
    waitForSettled,
    renderedKeys,
  }) => {
    await seedStorage({ params: { view: "starred" } });
    await waitForSettled();
    const keys = await renderedKeys();
    expect(keys.length).toBe(0);
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/nothing starred yet/i);
  });

  test("deadlineHeroDismissed=true suppresses the next-deadline hero even with starred events", async ({
    page,
    seedStorage,
    waitForSettled,
  }) => {
    const key = eventKey(findFixture("MOCKB"));
    await seedStorage({
      local: {
        [PREFS_KEY]: prefs({ deadlineHeroDismissed: true }, starred(key)),
      },
    });
    await waitForSettled();
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).not.toMatch(/your next deadline/i);
    expect(body).not.toMatch(/coming up/i);
  });

  test("permanentlyHiddenEventHeroes suppresses the hero for that event but keeps the row", async ({
    page,
    seedStorage,
    waitForSettled,
    renderedKeys,
  }) => {
    const key = eventKey(findFixture("MOCKB"));
    await seedStorage({
      local: {
        [PREFS_KEY]: prefs(
          { permanentlyHiddenEventHeroes: [key] },
          starred(key)
        ),
      },
    });
    await waitForSettled();
    const keys = await renderedKeys();
    expect(keys).toContain(key);
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).not.toMatch(/your next deadline/i);
  });

  test("layout=grid persists across reload", async ({
    page,
    seedStorage,
    waitForSettled,
  }) => {
    await seedStorage({
      local: { [PREFS_KEY]: prefs({ layout: "grid" }) },
    });
    await waitForSettled();
    const gridPressed = await page.$eval(
      'button[aria-label="Grid view"]',
      (el) => (el as HTMLButtonElement).getAttribute("aria-pressed")
    );
    expect(gridPressed).toBe("true");
  });

  test("eventPrefs.hidden removes the event from the All-events list", async ({
    seedStorage,
    waitForSettled,
    renderedKeys,
  }) => {
    const hiddenKey = eventKey(findFixture("MOCKB"));
    await seedStorage({
      local: {
        [PREFS_KEY]: prefs({}, { [hiddenKey]: { hidden: true } }),
      },
    });
    await waitForSettled();
    const keys = await renderedKeys();
    expect(keys).not.toContain(hiddenKey);
    expect(keys.length).toBe(activeEvents().length - 1);
  });

  test("collapseHintDismissed suppresses the 'tap any date heading' tip", async ({
    page,
    seedStorage,
    waitForSettled,
  }) => {
    await seedStorage({
      local: { [PREFS_KEY]: prefs({ collapseHintDismissed: true }) },
    });
    await waitForSettled();
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).not.toMatch(/tap any date heading/i);
  });

  test("collapsedDateGroups session entry restores collapsed groups on load", async ({
    page,
    seedStorage,
    waitForSettled,
  }) => {
    // MOCKE has paper deadline 2026-06-01 in YAML, but the Zod parse rewrites
    // `-` to `/` (the date-fns AOE handling note in CLAUDE.md). The string
    // round-tripped through sessionStorage by toggleCollapsed uses the slash
    // form, so the seed must match.
    const collapseDate = "2026/06/01";
    await seedStorage({
      session: { [COLLAPSED_KEY]: [collapseDate] },
    });
    await waitForSettled();
    // The MOCKE date group's header button should report aria-expanded=false
    // and its content wrapper (the overflow:hidden ancestor of the row, which
    // CollapsibleGroup marks with aria-hidden when collapsed) should have
    // zero rendered height.
    const mockeKey = eventKey(findFixture("MOCKE"));
    const groupState = await page.$eval(
      `[data-event-key="${mockeKey}"]`,
      (el) => {
        const wrapper = (el as HTMLElement).closest('[aria-hidden="true"]');
        return wrapper === null
          ? { aria: null, height: null }
          : {
              aria: wrapper.getAttribute("aria-hidden"),
              height: (wrapper as HTMLElement).getBoundingClientRect().height,
            };
      }
    );
    expect(groupState.aria).toBe("true");
    expect(groupState.height).toBe(0);
  });

  test("partial prefs object merges with defaults without crashing", async ({
    page,
    seedStorage,
    waitForSettled,
    renderedKeys,
  }) => {
    // Old localStorage snapshots may lack newer fields. The settle path must
    // fill in defaults for missing keys rather than throwing or rendering
    // an undefined-driven UI.
    await seedStorage({
      local: { [PREFS_KEY]: { display: { layout: "grid" } } },
    });
    await waitForSettled();
    const keys = await renderedKeys();
    expect(keys.length).toBe(activeEvents().length);
    const gridPressed = await page.$eval(
      'button[aria-label="Grid view"]',
      (el) => (el as HTMLButtonElement).getAttribute("aria-pressed")
    );
    expect(gridPressed).toBe("true");
  });

  test("invalid JSON in localStorage falls back to defaults", async ({
    seedStorage,
    waitForSettled,
    renderedKeys,
  }) => {
    await seedStorage({ local: { [PREFS_KEY]: "{not json" } });
    await waitForSettled();
    const keys = await renderedKeys();
    expect(keys.length).toBe(activeEvents().length);
  });
});
