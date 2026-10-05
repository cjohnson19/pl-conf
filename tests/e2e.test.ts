import fs from "node:fs";
import path from "node:path";
import { events } from "@pl-conf/data";
import {
  eventKey,
  eventPath,
  isActiveAt,
  type ScheduledEvent,
} from "@pl-conf/core";
import { dateStyles, formatDateRange } from "@/lib/date-formatters";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { afterAll, beforeAll, describe, expect, test as base } from "vitest";
import { DEFERRED_CHUNK_ATTR } from "@/lib/deferred-chunks";
import { E2E_BASE_URL as BASE_URL } from "./e2e-url";
import { FROZEN_NOW_ISO } from "./frozen-now";

const FROZEN_NOW = new Date(FROZEN_NOW_ISO);

let browser: Browser;

beforeAll(async () => {
  browser = await puppeteer.launch({ headless: true });
});

afterAll(async () => {
  await browser.close();
});

const activeEvents = (): ScheduledEvent[] =>
  Object.values(events).filter(isActiveAt(FROZEN_NOW));

const findFixture = (abbrev: string): ScheduledEvent => {
  const e = Object.values(events).find((x) => x.abbreviation === abbrev);
  if (!e) throw new Error(`Fixture ${abbrev} missing`);
  return e;
};

const installFrozenClock = (page: Page) =>
  page.evaluateOnNewDocument((iso) => {
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

// A fresh browser context with the frozen clock installed, torn down after
// `run`. Navigation is left to the caller so it can intercept or emulate first.
const withPage = async (run: (page: Page) => Promise<void>) => {
  const context = await browser.createBrowserContext();
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    await page.setViewport({ width: 1280, height: 800 });
    await installFrozenClock(page);
    await run(page);
  } finally {
    await context.close();
  }
};

const test = base.extend<{ page: Page }>({
  // biome-ignore lint/correctness/noEmptyPattern: vitest fixture signature requires destructuring the fixtures arg even when unused
  page: async ({}, use) =>
    withPage(async (page) => {
      await page.goto(BASE_URL, { waitUntil: "networkidle2" });
      await use(page);
    }),
});

const renderedKeys = (page: Page) =>
  page.$$eval("[data-event-key]", (nodes) =>
    nodes
      .filter((n) => (n as HTMLElement).offsetParent !== null)
      .map((n) => n.getAttribute("data-event-key") ?? "")
  );

// Rows are server-rendered and hidden with CSS, so only visible rows count.
const waitForRows = (page: Page, count = -1) =>
  page.waitForFunction(
    (n) => {
      const visible = Array.from(
        document.querySelectorAll("[data-event-key]")
      ).filter((el) => (el as HTMLElement).offsetParent !== null).length;
      return n < 0 ? visible > 0 : visible === n;
    },
    {},
    count
  );

const clickButtonStartingWith = (page: Page, label: string) =>
  page.evaluate((l) => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.trim().startsWith(l)
    );
    (btn as HTMLButtonElement | undefined)?.click();
  }, label);

const goToAllEvents = async (page: Page) => {
  await clickButtonStartingWith(page, "All events");
  await waitForRows(page);
};

const star = async (page: Page, key: string) => {
  await page.click(`[data-event-key="${key}"] button[aria-label^="Star "]`);
  await page.waitForSelector(
    `[data-event-key="${key}"] button[aria-pressed="true"]`
  );
};

const unstarButton = (page: Page, key: string) =>
  page.$(`[data-event-key="${key}"] button[aria-label^="Unstar "]`);

type StorageSeed = {
  local?: Record<string, unknown>;
  session?: Record<string, unknown>;
  params?: Record<string, string>;
};

const seedStorage = async (page: Page, seed: StorageSeed) => {
  await page.evaluate((s: StorageSeed) => {
    const write = (store: Storage, entries: Record<string, unknown> = {}) =>
      Object.entries(entries).forEach(([k, v]) => {
        store.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
      });
    write(localStorage, s.local);
    write(sessionStorage, s.session);
  }, seed);
  if (seed.params) {
    const qs = new URLSearchParams(seed.params).toString();
    await page.goto(`${BASE_URL}?${qs}`, { waitUntil: "networkidle2" });
  } else {
    await page.reload({ waitUntil: "networkidle2" });
  }
};

// EventListContainer sets data-pl-conf-hydrated on the html element in a
// mount-time effect. The short delay after it lets follow-up effects
// (localStorage prefs load, hero pickHero, hero transition) commit.
const waitForHydration = (page: Page, timeout = 5000) =>
  page.waitForFunction(
    () => document.documentElement.dataset.plConfHydrated === "1",
    { timeout }
  );

const waitForSettled = async (page: Page) => {
  await waitForHydration(page);
  await new Promise((resolve) => setTimeout(resolve, 350));
};

// The production rewrite that makes hydration chunks load after first paint
// lives in nginx; read it from there so the test applies exactly what ships.
const nginxChunkRewrite = (() => {
  const conf = fs.readFileSync(
    path.resolve(import.meta.dirname, "../docker/nginx.conf"),
    "utf8"
  );
  const match = conf.match(/sub_filter '([^']+)' '([^']+)';/);
  if (!match) throw new Error("docker/nginx.conf has no chunk sub_filter");
  const [, search, replace] = match;
  expect(conf).toContain("sub_filter_once off;");
  expect(replace).toContain(DEFERRED_CHUNK_ATTR);
  return (html: string) => html.replaceAll(search, replace);
})();

// Popovers and sheets mount lazily and animate in; clicking mid-slide misses.
const animationsDone = async (page: Page, selector: string) => {
  const el = await page.waitForSelector(selector);
  await el?.evaluate((node) =>
    Promise.all(node.getAnimations().map((a) => a.finished)).then(() => {})
  );
};

const waitForIncludeDeadlinesPref = (page: Page, value: boolean) =>
  page.waitForFunction(
    (v) =>
      JSON.parse(localStorage.getItem("userPrefsV2") ?? "{}")?.display
        ?.includeCalendarDeadlines === v,
    {},
    value
  );

describe.concurrent("event list", () => {
  test("auto-switches to All events when no events are starred", async ({
    page,
  }) => {
    await waitForRows(page);
    const keys = await renderedKeys(page);
    const expected = activeEvents().map(eventKey);
    expect(keys.length).toBe(expected.length);
    keys.forEach((k) => {
      expect(expected).toContain(k);
    });
  });

  test("orders events by next-deadline ascending, no-deadline last", async ({
    page,
  }) => {
    await goToAllEvents(page);
    const keys = await renderedKeys(page);
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
  }) => {
    await goToAllEvents(page);
    const sample = activeEvents()[0];
    expect(sample).toBeDefined();
    const key = eventKey(sample);

    await star(page, key);

    const store = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("userPrefsV2") ?? "{}")
    );
    expect(store?.eventPrefs?.[key]?.favorite).toBe(true);
  });

  test("starred events appear in the Starred view across refresh", async ({
    page,
  }) => {
    await goToAllEvents(page);
    const sample = activeEvents()[0];
    const key = eventKey(sample);

    await star(page, key);

    await page.reload({ waitUntil: "networkidle2" });
    await page.waitForSelector(`[data-event-key="${key}"]`);
    const keys = await renderedKeys(page);
    expect(keys).toContain(key);
  });

  test("unstarring removes the event from the Starred view", async ({
    page,
  }) => {
    await goToAllEvents(page);
    const sample = activeEvents()[0];
    const key = eventKey(sample);

    await star(page, key);

    await clickButtonStartingWith(page, "Starred");
    await page.waitForSelector(`[data-event-key="${key}"]`);

    const unstar = await unstarButton(page, key);
    expect(unstar).not.toBeNull();
    await unstar?.evaluate((b) => (b as HTMLButtonElement).click());

    await page.waitForFunction(
      (k) => {
        const el = document.querySelector(
          `[data-event-key="${k}"]`
        ) as HTMLElement | null;
        return !el || el.offsetParent === null;
      },
      {},
      key
    );
    const keys = await renderedKeys(page);
    expect(keys).not.toContain(key);
  });
});

describe("deferred hydration chunks", () => {
  // Production nginx rewrites the chunk <script> tags so they load after first
  // paint (docker/nginx.conf, app/lib/deferred-chunks.ts). The fixture server
  // has no nginx, so apply the identical substitution to the document here and
  // check that the inline loader still brings the page to a hydrated state,
  // with every chunk fetched only after the load event.
  test("hydrates with every chunk requested after load", () =>
    withPage(async (page) => {
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        if (req.resourceType() !== "document") {
          void req.continue();
          return;
        }
        void fetch(req.url())
          .then((res) => res.text())
          .then((html) =>
            req.respond({
              status: 200,
              contentType: "text/html; charset=utf-8",
              body: nginxChunkRewrite(html),
            })
          );
      });
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await waitForHydration(page, 10000);
      const timing = await page.evaluate(() => {
        const [nav] = performance.getEntriesByType(
          "navigation"
        ) as PerformanceNavigationTiming[];
        // Next may also <link rel="preload"> a chunk, which is allowed to
        // fetch early; only the script tags themselves must wait.
        const chunkStarts = (
          performance.getEntriesByType(
            "resource"
          ) as PerformanceResourceTiming[]
        )
          .filter(
            (e) =>
              e.initiatorType === "script" &&
              e.name.includes("/_next/static/chunks/")
          )
          .map((e) => e.startTime);
        return {
          loadEventStart: nav?.loadEventStart ?? Number.NaN,
          chunkStarts,
          inert: document.querySelectorAll("script[data-pl-defer]").length,
        };
      });
      expect(timing.chunkStarts.length).toBeGreaterThan(0);
      expect(timing.inert).toBe(0);
      timing.chunkStarts.forEach((start) => {
        expect(start).toBeGreaterThanOrEqual(timing.loadEventStart);
      });
    }));
});

describe("viewer locale", () => {
  // Dates are server-rendered in en-US; LocalDate hydrates with that string
  // and then re-renders in the browser's locale (components/local-date.tsx).
  test("re-formats server-rendered dates in the browser's locale", () =>
    withPage(async (page) => {
      const cdp = await page.createCDPSession();
      await cdp.send("Emulation.setLocaleOverride", { locale: "de-DE" });
      await page.goto(BASE_URL, { waitUntil: "networkidle2" });

      const e = activeEvents().find(
        (x) => x.date.start !== "TBD" && x.date.end !== "TBD"
      );
      if (!e) throw new Error("No fixture with concrete dates");
      const server = formatDateRange(
        e.date.start,
        e.date.end,
        "short",
        "en-US"
      );
      const expected = await page.evaluate(
        (start, end, opts) => {
          const cal = (s: string) => {
            const [y, m, d] = s.split("/").map(Number);
            return new Date(y, m - 1, d);
          };
          return new Intl.DateTimeFormat(undefined, opts).formatRange(
            cal(start),
            cal(end)
          );
        },
        e.date.start,
        e.date.end,
        dateStyles.short
      );
      expect(expected).not.toBe(server);
      await page.waitForFunction(
        (k, text) =>
          document
            .querySelector(`[data-event-key="${k}"]`)
            ?.textContent?.includes(text) ?? false,
        {},
        eventKey(e),
        expected
      );
    }));
});

describe.concurrent("hero", () => {
  test("renders no hero when nothing is starred", async ({ page }) => {
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).not.toMatch(/your next deadline/i);
    expect(body).not.toMatch(/coming up/i);
  });

  test("opens the help popover with the site explainer", async ({ page }) => {
    const trigger = await page.waitForSelector(
      'button[aria-label="How this site works"]'
    );
    await trigger?.evaluate((b) => (b as HTMLButtonElement).click());
    await page.waitForFunction(() =>
      /small index of/i.test(document.body.innerText)
    );
  });

  test("swaps to the next-deadline hero once an event is starred", async ({
    page,
  }) => {
    await goToAllEvents(page);
    const mockb = findFixture("MOCKB");
    const key = eventKey(mockb);
    await star(page, key);

    await clickButtonStartingWith(page, "Starred");
    await page.waitForFunction(
      () =>
        /Your next deadline/i.test(document.body.innerText) ||
        /Coming up/i.test(document.body.innerText)
    );
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/MOCKB/);
  });

  test("renders minute-grain countdown when a deadline is on today's calendar date", async ({
    page,
  }) => {
    // MOCKE has paper: 2026-06-01, which is FROZEN_NOW's local calendar date.
    // humanCountdown's `days <= 0` branch fires whenever the deadline's local
    // calendar date is today or earlier — even if the AoE-clock-time-remaining
    // is still over 24 hours (e.g. AoE-end-of-June-1 viewed from CDT is
    // June 2 06:59 CDT, so at June 1 00:01 CDT we're 30h+ from AoE but the
    // text is already minute-grain). Pinning the rendered shape here forces
    // useNowTick to keep matching: if it ever falls back to a daily tick for
    // this case, the displayed text would drift stale instead of decrementing.
    await goToAllEvents(page);
    const mocke = findFixture("MOCKE");
    const key = eventKey(mocke);
    await star(page, key);

    await clickButtonStartingWith(page, "Starred");
    await page.waitForFunction(() => /MOCKE/.test(document.body.innerText));
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/MOCKE/);
    expect(body).toMatch(/in \d+ hours? \d+ minutes?/);
    expect(body).not.toMatch(/in \d+ days?/);
    expect(body).not.toMatch(/tomorrow/i);
  });
});

describe("search", () => {
  test("typing into the search pill filters the list", async ({ page }) => {
    await goToAllEvents(page);
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
      {},
      fullCount
    );

    const keys = await renderedKeys(page);
    expect(keys).toContain(eventKey(sample));
    expect(keys.length).toBeLessThan(fullCount);
  });
});

describe("category chips", () => {
  test("selecting Workshops only shows workshop-type events", async ({
    page,
  }) => {
    await clickButtonStartingWith(page, "All events");
    await clickButtonStartingWith(page, "Workshops");

    const expectedKeys = new Set(
      activeEvents()
        .filter((e) => e.type === "workshop")
        .map(eventKey)
    );

    await waitForRows(page, expectedKeys.size);

    const keys = await renderedKeys(page);
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
  }) => {
    await goToAllEvents(page);
    const mocka = findFixture("MOCKA");
    const key = eventKey(mocka);

    const result = await page.$eval(
      `[data-event-key="${key}"]`,
      (row, expected) => {
        const tagButtons = Array.from(
          row.querySelectorAll("button[data-tag]")
        ) as HTMLButtonElement[];
        const tags = tagButtons.map((b) => b.dataset.tag ?? "");
        const abbrevEl = Array.from(row.querySelectorAll("a, span")).find(
          (s) => s.textContent?.trim() === (expected as string)
        );
        const titleContainer = abbrevEl?.parentElement ?? null;
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
  }) => {
    await goToAllEvents(page);
    await page.click(tagsTriggerSelector);
    await page.waitForSelector(popoverSelector);

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
  }) => {
    await goToAllEvents(page);
    await page.click(tagsTriggerSelector);
    await page.waitForSelector(`${popoverSelector} button[data-tag="types"]`);
    await page.click(`${popoverSelector} button[data-tag="types"]`);

    const expectedKeys = new Set(
      [findFixture("MOCKA"), findFixture("MOCKC")].map(eventKey)
    );
    await waitForRows(page, expectedKeys.size);
    expect(new Set(await renderedKeys(page))).toEqual(expectedKeys);
  });

  test("selecting multiple tags applies OR semantics", async ({ page }) => {
    await goToAllEvents(page);
    await page.click(tagsTriggerSelector);
    await page.waitForSelector(`${popoverSelector} button[data-tag="types"]`);
    await page.click(`${popoverSelector} button[data-tag="types"]`);
    await page.click(`${popoverSelector} button[data-tag="semantics"]`);

    const expectedKeys = new Set(
      [findFixture("MOCKA"), findFixture("MOCKB"), findFixture("MOCKC")].map(
        eventKey
      )
    );
    await waitForRows(page, expectedKeys.size);
    expect(new Set(await renderedKeys(page))).toEqual(expectedKeys);
  });

  test("Clear resets active tags and restores the full list", async ({
    page,
  }) => {
    await goToAllEvents(page);
    await page.click(tagsTriggerSelector);
    await page.waitForSelector(`${popoverSelector} button[data-tag="types"]`);
    await page.click(`${popoverSelector} button[data-tag="types"]`);
    await waitForRows(page, 2);

    await page.click(`${popoverSelector} button:not([data-tag])`);
    await waitForRows(page, activeEvents().length);
    const keys = await renderedKeys(page);
    expect(keys.length).toBe(activeEvents().length);
  });

  test("clicking a tag pill on a row toggles that tag into the filter", async ({
    page,
  }) => {
    await goToAllEvents(page);
    const mocka = findFixture("MOCKA");
    const key = eventKey(mocka);

    await page.click(
      `[data-event-key="${key}"] button[data-tag="verification"]`
    );

    await waitForRows(page, 1);
    expect(await renderedKeys(page)).toEqual([key]);
  });
});

describe("submissions open view", () => {
  test("only shows events whose first deadline is still in the future", async ({
    page,
  }) => {
    await clickButtonStartingWith(page, "Submissions open");
    const expectedKeys = new Set(
      [findFixture("MOCKB"), findFixture("MOCKC"), findFixture("MOCKE")].map(
        eventKey
      )
    );
    // SSR ships every row and VisibilityStyle hides non-matching ones via
    // CSS, so a DOM-element count would never match. Use the visibility-aware
    // count instead.
    await waitForRows(page, expectedKeys.size);
    const keys = await renderedKeys(page);
    expect(new Set(keys)).toEqual(expectedKeys);
  });
});

describe("archive view", () => {
  const openArchive = async (page: Page) => {
    await clickButtonStartingWith(page, "Archive");
    // Unlike the other tabs, the archive is a real navigation: its rows are
    // not in the DOM until the server renders them.
    await page.waitForFunction(
      () => new URLSearchParams(location.search).get("view") === "archive",
      { timeout: 8000 }
    );
    await waitForRows(page, 2);
  };

  test("lists finished events, most recent first", async ({ page }) => {
    await openArchive(page);
    expect(await renderedKeys(page)).toEqual([
      eventKey(findFixture("MOCKF")),
      eventKey(findFixture("MOCKG")),
    ]);
  });

  test("swaps the list for a skeleton while the archive render is in flight", async ({
    page,
  }) => {
    // Slow the flight response down enough to observe the pending state.
    const cdp = await page.createCDPSession();
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 800,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
    await clickButtonStartingWith(page, "Archive");
    await page.waitForSelector("[data-list-skeleton]");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
    // The skeleton resolves into the archive rows once the render lands.
    await page.waitForFunction(
      () =>
        !document.querySelector("[data-list-skeleton]") &&
        new URLSearchParams(location.search).get("view") === "archive" &&
        document.querySelectorAll("[data-event-key]").length > 0,
      { timeout: 8000 }
    );
  });

  test("heads each group with the month the events took place in", async ({
    page,
  }) => {
    await openArchive(page);
    const headings = await page.$$eval("[data-group-keys] h2", (nodes) =>
      nodes.map((n) => (n.textContent ?? "").replace(/\s+/g, " ").trim())
    );
    expect(headings).toEqual(["February 2026", "September 2025"]);
  });

  test("finished events stay out of the live list", async ({ page }) => {
    await goToAllEvents(page);
    const keys = await renderedKeys(page);
    expect(keys).not.toContain(eventKey(findFixture("MOCKF")));
    expect(keys).not.toContain(eventKey(findFixture("MOCKG")));
    // MOCKD lists no deadlines, so it sits under the live list's own
    // catch-all rather than dropping out with the finished events.
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/no deadlines/i);
  });
});

describe.concurrent("multi-round badge", () => {
  test("renders Round N / M on events with past + future deadlines across rounds", async ({
    page,
  }) => {
    await goToAllEvents(page);
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
  const calendarTrigger = 'button[aria-label="Add MOCKB to calendar"]';

  const bounds = async (page: Page, selector: string) => {
    await animationsDone(page, selector);
    return page.$eval(selector, (el) => {
      const rect = el.getBoundingClientRect();
      return {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
      };
    });
  };

  const scrollToLastOption = async (page: Page, selector: string) => {
    const panel = await bounds(page, selector);
    const lastOption = `${selector} > :last-child`;
    expect((await bounds(page, lastOption)).bottom).toBeGreaterThan(
      panel.bottom
    );
    await page.mouse.move((panel.left + panel.right) / 2, panel.bottom - 20);
    await page.mouse.wheel({ deltaY: 2000 });
    await page.waitForFunction(
      (sel) => (document.querySelector(sel)?.scrollTop ?? 0) > 0,
      {},
      selector
    );
    const option = await bounds(page, lastOption);
    expect(option.top).toBeGreaterThanOrEqual(panel.top);
    expect(option.bottom).toBeLessThanOrEqual(panel.bottom);
    await page.mouse.click(
      (option.left + option.right) / 2,
      (option.top + option.bottom) / 2
    );
    await page.waitForFunction(
      (sel) => document.querySelector(sel)?.textContent?.includes("Copied"),
      {},
      lastOption
    );
  };

  test("event page calendar uses a scrollable mobile sheet", async ({
    page,
  }) => {
    await page.setViewport({
      width: 375,
      height: 500,
      isMobile: true,
      hasTouch: true,
    });
    await page
      .browserContext()
      .overridePermissions(BASE_URL, [
        "clipboard-read",
        "clipboard-sanitized-write",
      ]);
    await page.goto(`${BASE_URL}${eventPath(findFixture("MOCKB"))}`, {
      waitUntil: "networkidle2",
    });
    await page.tap(calendarTrigger);
    await page.waitForSelector('[role="dialog"]');
    expect(await page.$('[role="menu"]')).toBeNull();
    const panel = await bounds(page, '[role="dialog"]');
    expect(panel.width).toBe(375);
    expect(panel.bottom).toBe(500);
    expect(panel.top).toBeGreaterThan(0);
    await scrollToLastOption(page, '[role="dialog"]');
    await page.keyboard.press("Escape");
    await page.waitForSelector('[role="dialog"]', { hidden: true });
    expect(
      await page.$eval(calendarTrigger, (el) => el === document.activeElement)
    ).toBe(true);
  });

  test("grid calendar uses the mobile sheet", async ({ page }) => {
    await page.setViewport({ width: 375, height: 800 });
    await goToAllEvents(page);
    await page.click('button[aria-label="Grid view"]');
    await page.click(calendarTrigger);
    await page.waitForSelector('[role="dialog"]');
    expect(await page.$('[role="menu"]')).toBeNull();
    expect((await bounds(page, '[role="dialog"]')).width).toBe(375);
  });

  test("calendar presentation follows resizing without reopening a closed menu", async ({
    page,
  }) => {
    await page.setViewport({ width: 375, height: 800 });
    await page.goto(`${BASE_URL}${eventPath(findFixture("MOCKB"))}`, {
      waitUntil: "networkidle2",
    });
    await page.click(calendarTrigger);
    await page.waitForSelector('[role="dialog"]');
    await page.setViewport({ width: 1280, height: 800 });
    await page.waitForSelector('[role="menu"]');
    expect(await page.$('[role="dialog"]')).toBeNull();
    await page.keyboard.press("Escape");
    await page.waitForSelector('[role="menu"]', { hidden: true });
    await page.setViewport({ width: 375, height: 800 });
    await page.waitForFunction(
      (sel) =>
        document.querySelector(sel)?.getAttribute("aria-haspopup") === "dialog",
      {},
      calendarTrigger
    );
    expect(await page.$('[role="dialog"], [role="menu"]')).toBeNull();
    await page.click(calendarTrigger);
    await page.waitForSelector('[role="dialog"]');
    await page.click('button[aria-label="Close"]');
    await page.waitForSelector('[role="dialog"]', { hidden: true });
  });

  test("desktop calendar near the viewport bottom scrolls to its last option", async ({
    page,
  }) => {
    await page.setViewport({ width: 1280, height: 320 });
    await page
      .browserContext()
      .overridePermissions(BASE_URL, [
        "clipboard-read",
        "clipboard-sanitized-write",
      ]);
    await page.goto(`${BASE_URL}${eventPath(findFixture("MOCKB"))}`, {
      waitUntil: "networkidle2",
    });
    await page.$eval(calendarTrigger, (el) =>
      el.scrollIntoView({ block: "end" })
    );
    expect((await bounds(page, calendarTrigger)).bottom).toBeGreaterThan(280);
    await page.click(calendarTrigger);
    await page.waitForSelector('[role="menu"]');
    const panel = await bounds(page, '[role="menu"]');
    expect(panel.top).toBeGreaterThanOrEqual(0);
    expect(panel.bottom).toBeLessThanOrEqual(320);
    await scrollToLastOption(page, '[role="menu"]');
    await page.keyboard.press("Escape");
    await page.waitForSelector('[role="menu"]', { hidden: true });
    expect(
      await page.$eval(calendarTrigger, (el) => el === document.activeElement)
    ).toBe(true);
    await page.keyboard.press("ArrowDown");
    await page.waitForSelector('[role="menu"]');
    await page.keyboard.press("End");
    await page.waitForFunction(() =>
      /Copy feed BASE_URL|Copied/.test(
        document.activeElement?.textContent ?? ""
      )
    );
    const lastOption = await bounds(page, '[role="menu"] :focus');
    const reopened = await bounds(page, '[role="menu"]');
    expect(lastOption.top).toBeGreaterThanOrEqual(reopened.top);
    expect(lastOption.bottom).toBeLessThanOrEqual(reopened.bottom);
  });

  test("toggling 'Include submission deadlines' regenerates the .ics with extra VEVENTs", async ({
    page,
  }) => {
    await goToAllEvents(page);
    const mockb = findFixture("MOCKB");
    const key = eventKey(mockb);

    const triggerSelector = `[data-event-key="${key}"] button[aria-label^="Add MOCKB to calendar"]`;
    await page.waitForSelector(triggerSelector);
    await page.click(triggerSelector);

    const icsLinkSelector = 'a[download$=".ics"]';
    await page.waitForSelector(icsLinkSelector);

    // The href is a real path under public/ical now, not a blob: BASE_URL, so a
    // missing or misnamed feed comes back as the 404 HTML page. Surface that
    // rather than letting it fail later as a VEVENT count of 0.
    const fetchIcs = (selector: string) =>
      page.evaluate(async (sel) => {
        const a = document.querySelector(sel) as HTMLAnchorElement | null;
        if (!a) return null;
        const res = await fetch(a.href);
        if (!res.ok) return `HTTP ${res.status} for ${a.getAttribute("href")}`;
        return res.text();
      }, selector);

    const withDeadlines = await fetchIcs(icsLinkSelector);
    expect(withDeadlines).toContain("BEGIN:VCALENDAR");
    const withDeadlinesCount = (withDeadlines?.match(/BEGIN:VEVENT/g) ?? [])
      .length;
    expect(withDeadlinesCount).toBeGreaterThan(1);

    const firstHref = await page.$eval(
      icsLinkSelector,
      (a) => (a as HTMLAnchorElement).href
    );
    const checkboxSelector = 'input[type="checkbox"]';
    await page.waitForSelector(checkboxSelector);
    await page.click(checkboxSelector);

    await page.waitForFunction(
      (sel, prev) => {
        const a = document.querySelector(sel) as HTMLAnchorElement | null;
        return !!a && a.href !== prev;
      },
      {},
      icsLinkSelector,
      firstHref
    );

    const eventsOnly = await fetchIcs(icsLinkSelector);
    expect(eventsOnly).toContain("BEGIN:VCALENDAR");
    const eventsOnlyCount = (eventsOnly?.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(eventsOnlyCount).toBe(1);
    expect(eventsOnlyCount).toBeLessThan(withDeadlinesCount);
  });

  test("'Include submission deadlines' persists to localStorage and is restored across reloads", async ({
    page,
  }) => {
    await goToAllEvents(page);
    const mockb = findFixture("MOCKB");
    const key = eventKey(mockb);

    const triggerSelector = `[data-event-key="${key}"] button[aria-label^="Add MOCKB to calendar"]`;
    const checkboxSelector = 'input[type="checkbox"]';

    await page.waitForSelector(triggerSelector);
    await page.click(triggerSelector);
    await page.waitForSelector(checkboxSelector);

    const initialChecked = await page.$eval(
      checkboxSelector,
      (el) => (el as HTMLInputElement).checked
    );
    expect(initialChecked).toBe(true);

    await page.click(checkboxSelector);
    await waitForIncludeDeadlinesPref(page, false);

    await page.reload({ waitUntil: "networkidle2" });
    await goToAllEvents(page);
    await page.waitForSelector(triggerSelector);
    await page.click(triggerSelector);
    await page.waitForSelector(checkboxSelector);

    const restoredChecked = await page.$eval(
      checkboxSelector,
      (el) => (el as HTMLInputElement).checked
    );
    expect(restoredChecked).toBe(false);
  });

  test("toggle state is shared between the calendar menu and the mobile action sheet", async ({
    page,
  }) => {
    await goToAllEvents(page);
    const mockb = findFixture("MOCKB");
    const key = eventKey(mockb);

    const calendarTrigger = `[data-event-key="${key}"] button[aria-label^="Add MOCKB to calendar"]`;
    const checkboxSelector = 'input[type="checkbox"]';

    await page.waitForSelector(calendarTrigger);
    await page.click(calendarTrigger);
    await page.waitForSelector(checkboxSelector);
    await page.click(checkboxSelector);
    await waitForIncludeDeadlinesPref(page, false);

    await page.keyboard.press("Escape");
    await page.waitForFunction(
      (sel) => !document.querySelector(sel),
      {},
      checkboxSelector
    );

    await page.setViewport({ width: 375, height: 800 });
    const sheetTrigger = `[data-event-key="${key}"] button[aria-label^="Actions for MOCKB"]`;
    await page.waitForSelector(sheetTrigger);
    await page.click(sheetTrigger);
    await animationsDone(page, '[role="dialog"]');

    const sheetChecked = await page.$eval(
      checkboxSelector,
      (el) => (el as HTMLInputElement).checked
    );
    expect(sheetChecked).toBe(false);

    await page.click(checkboxSelector);
    await waitForIncludeDeadlinesPref(page, true);

    await page.keyboard.press("Escape");
    await page.waitForFunction(
      (sel) => !document.querySelector(sel),
      {},
      checkboxSelector
    );

    await page.setViewport({ width: 1280, height: 800 });
    // The trigger re-renders from the sheet's to the menu's after the resize.
    await page.waitForSelector(`${calendarTrigger}[aria-haspopup="menu"]`);
    await page.click(calendarTrigger);
    await page.waitForSelector(checkboxSelector);

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
  }) => {
    await page.setViewport({ width: 375, height: 800 });
    await goToAllEvents(page);
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
    await page.waitForFunction(() =>
      /Star this event/i.test(document.body.innerText)
    );
  });
});

describe("event pages", () => {
  test("the row abbreviation links to the event's dedicated page", async ({
    page,
  }) => {
    await goToAllEvents(page);
    const mocka = findFixture("MOCKA");
    const key = eventKey(mocka);
    const href = await page.$eval(
      `[data-event-key="${key}"] a[href^="/event/"]`,
      (a) => (a as HTMLAnchorElement).getAttribute("href")
    );
    expect(href).toBe(eventPath(mocka));
  });

  test("the dedicated page renders the event heading, back link, and website link", async ({
    page,
  }) => {
    const mocka = findFixture("MOCKA");
    await page.goto(`${BASE_URL}${eventPath(mocka)}`, {
      waitUntil: "networkidle2",
    });

    const h1 = await page.$eval("h1", (el) => el.textContent?.trim());
    expect(h1).toBe(mocka.abbreviation);

    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/All events/);

    const hasSiteLink = await page.$$eval("main a", (links) =>
      links.some((a) => (a as HTMLAnchorElement).target === "_blank")
    );
    expect(hasSiteLink).toBe(true);
  });

  test("an event with TBD dates still routes and labels by its year", async ({
    page,
  }) => {
    const mockh = findFixture("MOCKH");

    const res = await page.goto(`${BASE_URL}${eventPath(mockh)}`, {
      waitUntil: "networkidle2",
    });
    expect(res?.status()).toBe(200);

    const h1 = await page.$eval("h1", (el) => el.textContent?.trim());
    expect(h1).toBe("MOCKH");

    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toContain("’26");
    expect(body).not.toMatch(/NaN/);
  });
});

describe("llms exports", () => {
  base("llms.txt links the markdown and JSON exports", async () => {
    const res = await fetch(`${BASE_URL}/llms.txt`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("/llms-full.txt");
    expect(text).toContain("/events.json");
  });

  base("llms-full.txt lists every event with ISO deadlines", async () => {
    const res = await fetch(`${BASE_URL}/llms-full.txt`);
    expect(res.status).toBe(200);
    const text = await res.text();
    Object.values(events).forEach((e) => {
      expect(text).toContain(`### ${e.abbreviation} ${e.year} — ${e.name}`);
    });
    expect(text).toContain("Important dates (Round 1):");
    expect(text).toContain("- Paper Submission: 2026-04-15");
  });

  base("events.json covers every event", async () => {
    const res = await fetch(`${BASE_URL}/events.json`);
    expect(res.status).toBe(200);
    const exported = (await res.json()) as { key: string }[];
    expect(new Set(exported.map((e) => e.key))).toEqual(
      new Set(Object.values(events).map((e) => eventKey(e)))
    );
  });
});

describe("back navigation", () => {
  const clickBackToList = (page: Page) =>
    page.evaluate(() => {
      const link = Array.from(document.querySelectorAll("a")).find(
        (a) => a.textContent?.trim() === "All events"
      );
      (link as HTMLAnchorElement | undefined)?.click();
    });

  const openEventFromList = async (page: Page, abbrev: string) => {
    const key = eventKey(findFixture(abbrev));
    await page.click(`[data-event-key="${key}"] a[href^="/event/"]`);
    await page.waitForFunction(() => document.querySelector("h1") !== null);
  };

  const waitForList = (page: Page) =>
    page.waitForFunction(() => location.pathname === "/");

  // history.length can't tell a pop from a push — traversing back leaves the
  // forward entries in place, so the count is unchanged either way. Tagging
  // the list entry's state does discriminate: returning restores the tag,
  // while a push mints an entry that never had it.
  const tagListEntry = (page: Page) =>
    page.evaluate(() =>
      history.replaceState({ ...history.state, e2eListEntry: true }, "")
    );

  const onTaggedListEntry = (page: Page) =>
    page.evaluate(() => history.state?.e2eListEntry === true);

  test("returns to the list entry rather than pushing a new one", async ({
    page,
  }) => {
    await page.setViewport({ width: 1280, height: 400 });
    await page.goto(`${BASE_URL}?c=conference`, { waitUntil: "networkidle2" });
    await waitForSettled(page);

    await page.evaluate(() => window.scrollBy(0, 300));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await tagListEntry(page);

    await openEventFromList(page, "MOCKA");
    await clickBackToList(page);
    await waitForList(page);

    expect(await onTaggedListEntry(page)).toBe(true);
    // A push would land on a bare "/" scrolled to the top.
    expect(await page.evaluate(() => location.search)).toBe("?c=conference");
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test("pops past every event visited when following relations", async ({
    page,
  }) => {
    await waitForSettled(page);
    await tagListEntry(page);

    await openEventFromList(page, "MOCKA");
    await page.click('a[href^="/event/"]');
    await page.waitForFunction(
      () => document.querySelector("h1")?.textContent?.trim() === "MOCKC"
    );
    expect(await page.evaluate(() => history.state?.plConfDepth)).toBe(2);

    await clickBackToList(page);
    await waitForList(page);
    expect(await onTaggedListEntry(page)).toBe(true);
  });

  test("falls back to a plain link when there is no list entry behind", async ({
    page,
  }) => {
    const mockc = findFixture("MOCKC");
    await page.goto(`${BASE_URL}${eventPath(mockc)}`, {
      waitUntil: "networkidle2",
    });
    const entriesBefore = await page.evaluate(() => history.length);
    expect(
      await page.evaluate(() => history.state?.plConfDepth)
    ).toBeUndefined();

    await clickBackToList(page);
    await waitForList(page);

    // Deep link, new tab, pasted BASE_URL: popping would jump into unrelated
    // history, so the anchor navigates instead.
    expect(await page.evaluate(() => history.length)).toBe(entriesBefore + 1);
  });
});

describe("collapse hint", () => {
  // The tip must ship in the server HTML: inserting it after hydration pushed
  // every row below it down — a counted layout shift on each first-time
  // visit. Dismissed visitors instead get it hidden by the pre-paint script
  // in layout.tsx, which runs before anything renders.
  const withShiftProbe = async (
    run: (page: Page) => Promise<void>,
    { dismissed = false } = {}
  ) =>
    withPage(async (page) => {
      if (dismissed) {
        await page.evaluateOnNewDocument(() => {
          localStorage.setItem(
            "userPrefsV2",
            JSON.stringify({ display: { collapseHintDismissed: true } })
          );
        });
      }
      await page.evaluateOnNewDocument(() => {
        const shifts: number[] = [];
        (window as unknown as { __shifts: number[] }).__shifts = shifts;
        new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const shift = entry as unknown as {
              value: number;
              hadRecentInput: boolean;
            };
            if (!shift.hadRecentInput) shifts.push(shift.value);
          });
        }).observe({ type: "layout-shift", buffered: true });
      });
      // Delay every response so first paint (inline CSS in the document)
      // lands well before hydration — the window where a client-inserted tip
      // visibly shifts the list.
      const cdp = await page.createCDPSession();
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 400,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });
      await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 30000 });
      await waitForHydration(page, 15000);
      await new Promise((resolve) => setTimeout(resolve, 350));
      await run(page);
    });

  // Ignore sub-threshold noise (the self-hosted font swap registers ~0.0001).
  const visibleShifts = (page: Page) =>
    page.evaluate(() =>
      (window as unknown as { __shifts: number[] }).__shifts.filter(
        (v) => v >= 0.005
      )
    );

  test("ships the tip in the server-rendered HTML", async () => {
    const res = await fetch(`${BASE_URL}/`);
    const html = await res.text();
    expect(html).toContain("data-collapse-hint");
  });

  test("appears for first-time visitors without shifting the list", async () => {
    await withShiftProbe(async (page) => {
      const hintVisible = await page.$eval(
        "[data-collapse-hint]",
        (el) => (el as HTMLElement).offsetParent !== null
      );
      expect(hintVisible).toBe(true);
      expect(await visibleShifts(page)).toEqual([]);
    });
  });

  test("never paints for visitors who dismissed it", async () => {
    await withShiftProbe(
      async (page) => {
        const hintVisible = await page.evaluate(() => {
          const el = document.querySelector("[data-collapse-hint]");
          return el !== null && (el as HTMLElement).offsetParent !== null;
        });
        expect(hintVisible).toBe(false);
        expect(await visibleShifts(page)).toEqual([]);
      },
      { dismissed: true }
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
  }) => {
    await waitForSettled(page);
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).not.toMatch(/your next deadline/i);

    const keys = await renderedKeys(page);
    expect(keys.length).toBe(activeEvents().length);

    const listPressed = await page.$eval(
      'button[aria-label="List view"]',
      (el) => (el as HTMLButtonElement).getAttribute("aria-pressed")
    );
    expect(listPressed).toBe("true");
  });

  test("view=all (default) is honored even when the user has starred events", async ({
    page,
  }) => {
    const key = eventKey(findFixture("MOCKB"));
    await seedStorage(page, {
      local: { [PREFS_KEY]: prefs({}, starred(key)) },
    });
    await waitForSettled(page);
    const keys = await renderedKeys(page);
    expect(keys.length).toBe(activeEvents().length);
    expect(keys).toContain(key);
  });

  test("?view=starred is honored even when nothing is starred (empty state)", async ({
    page,
  }) => {
    await seedStorage(page, { params: { view: "starred" } });
    await waitForSettled(page);
    const keys = await renderedKeys(page);
    expect(keys.length).toBe(0);
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/nothing starred yet/i);
  });

  test("deadlineHeroDismissed=true suppresses the next-deadline hero even with starred events", async ({
    page,
  }) => {
    const key = eventKey(findFixture("MOCKB"));
    await seedStorage(page, {
      local: {
        [PREFS_KEY]: prefs({ deadlineHeroDismissed: true }, starred(key)),
      },
    });
    await waitForSettled(page);
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).not.toMatch(/your next deadline/i);
    expect(body).not.toMatch(/coming up/i);
  });

  test("permanentlyHiddenEventHeroes suppresses the hero for that event but keeps the row", async ({
    page,
  }) => {
    const key = eventKey(findFixture("MOCKB"));
    await seedStorage(page, {
      local: {
        [PREFS_KEY]: prefs(
          { permanentlyHiddenEventHeroes: [key] },
          starred(key)
        ),
      },
    });
    await waitForSettled(page);
    const keys = await renderedKeys(page);
    expect(keys).toContain(key);
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).not.toMatch(/your next deadline/i);
  });

  test("layout=grid persists across reload", async ({ page }) => {
    await seedStorage(page, {
      local: { [PREFS_KEY]: prefs({ layout: "grid" }) },
    });
    await waitForSettled(page);
    const gridPressed = await page.$eval(
      'button[aria-label="Grid view"]',
      (el) => (el as HTMLButtonElement).getAttribute("aria-pressed")
    );
    expect(gridPressed).toBe("true");
  });

  test("collapseHintDismissed suppresses the 'tap any date heading' tip", async ({
    page,
  }) => {
    await seedStorage(page, {
      local: { [PREFS_KEY]: prefs({ collapseHintDismissed: true }) },
    });
    await waitForSettled(page);
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).not.toMatch(/tap any heading/i);
  });

  test("collapsedDateGroups session entry restores collapsed groups on load", async ({
    page,
  }) => {
    // MOCKE has paper deadline 2026-06-01 in YAML, but the Zod parse rewrites
    // `-` to `/` (CalendarDate). The string round-tripped through
    // sessionStorage by toggleCollapsed uses the slash form, so the seed must
    // match.
    const collapseDate = "2026/06/01";
    await seedStorage(page, {
      session: { [COLLAPSED_KEY]: [collapseDate] },
    });
    await waitForSettled(page);
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

  test("collapsing two groups keeps both collapsed across a reload", async ({
    page,
  }) => {
    await goToAllEvents(page);
    const headers = 'button[aria-label^="Hide events for "]';
    const collapse = async (index: number) => {
      const buttons = await page.$$(headers);
      const button = buttons[index];
      const label = await button?.evaluate((b) => b.getAttribute("aria-label"));
      await button?.evaluate((b) => (b as HTMLButtonElement).click());
      await page.waitForSelector(
        `button[aria-label="${label?.replace("Hide", "Show")}"]`
      );
      return label;
    };
    const first = await collapse(0);
    // The first header is now "Show events…", so index 0 is the next group.
    const second = await collapse(0);
    expect(first).not.toBe(second);

    await page.reload({ waitUntil: "networkidle2" });
    await waitForSettled(page);
    const collapsed = await page.$$eval(
      'button[aria-label^="Show events for "]',
      (nodes) => nodes.map((n) => n.getAttribute("aria-label"))
    );
    expect(collapsed).toEqual([
      first?.replace("Hide", "Show"),
      second?.replace("Hide", "Show"),
    ]);
  });

  test("partial prefs object merges with defaults without crashing", async ({
    page,
  }) => {
    // Old localStorage snapshots may lack newer fields. The settle path must
    // fill in defaults for missing keys rather than throwing or rendering
    // an undefined-driven UI.
    await seedStorage(page, {
      local: { [PREFS_KEY]: { display: { layout: "grid" } } },
    });
    await waitForSettled(page);
    const keys = await renderedKeys(page);
    expect(keys.length).toBe(activeEvents().length);
    const gridPressed = await page.$eval(
      'button[aria-label="Grid view"]',
      (el) => (el as HTMLButtonElement).getAttribute("aria-pressed")
    );
    expect(gridPressed).toBe("true");
  });

  test("invalid JSON in localStorage falls back to defaults", async ({
    page,
  }) => {
    await seedStorage(page, { local: { [PREFS_KEY]: "{not json" } });
    await waitForSettled(page);
    const keys = await renderedKeys(page);
    expect(keys.length).toBe(activeEvents().length);
  });
});
