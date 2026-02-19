import { events } from "@generated";
import { eventKey, isActive } from "@pl-conf/core";
import puppeteer, { ElementHandle, type Browser, type Page } from "puppeteer";
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
  await page.evaluate(() => {
    localStorage.clear();
  });
});

afterAll(async () => {
  await browser.close();
});

function currentOrFutureEvents() {
  return Object.values(events).filter(isActive);
}

async function eventCardAbbreviation(elem: ElementHandle): Promise<string> {
  return elem.$eval(".event-abbrev", (node) =>
    node.textContent.split("'")[0].trim()
  );
}

async function eventListAbbreviations(): Promise<string[]> {
  return await Promise.all(
    (await page.$$(".event-card")).map(async (card) =>
      eventCardAbbreviation(card)
    )
  );
}

describe("preferences", () => {
  it("loads all events initially", async () => {
    await page.goto(URL, { waitUntil: "networkidle2" });
    const shownEvents = await eventListAbbreviations();
    const currentEvents = currentOrFutureEvents().map((e) => e.abbreviation);
    expect(
      shownEvents.every(
        (elem) => currentEvents.includes(elem),
        "Not every event is shown by default"
      )
    );
  });

  it("places favorite events at top of page", async () => {
    await page.goto(URL, { waitUntil: "networkidle2" });
    const eventCards = await page.$$(".event-card");
    const finalEvent = eventCards[eventCards.length - 1];
    const finalEventAbbrev = await eventCardAbbreviation(finalEvent);
    const favButton = await finalEvent.$(".favorite-button");
    expect(favButton).not.toBeNull();
    await favButton!.click();
    const newArrangedEventCards = await page.$$(".event-card");
    const firstCard = newArrangedEventCards[0];
    expect(await eventCardAbbreviation(firstCard)).toBe(finalEventAbbrev);
  });

  it("places favorite events at top of page across refresh", async () => {
    await page.goto(URL, { waitUntil: "networkidle2" });
    const eventCards = await page.$$(".event-card");
    const finalEvent = eventCards[eventCards.length - 1];
    const finalEventAbbrev = await eventCardAbbreviation(finalEvent);
    const favButton = await finalEvent.$(".favorite-button");
    expect(favButton).not.toBeNull();
    await favButton!.click();
    await page.reload({ waitUntil: "networkidle2" });
    const newArrangedEventCards = await page.$$(".event-card");
    const firstCard = newArrangedEventCards[0];
    expect(await eventCardAbbreviation(firstCard)).toBe(finalEventAbbrev);
  });

  it("clicking favorite event updates localstorage", async () => {
    await page.goto(URL, { waitUntil: "networkidle2" });
    const eventCards = await page.$$(".event-card");
    const finalEventCard = eventCards[eventCards.length - 1];
    const finalEventAbbrev = await eventCardAbbreviation(finalEventCard);
    const finalEvent = events[finalEventAbbrev];
    const finalEventPrefKey = eventKey(finalEvent);
    const favButton = await finalEventCard.$(".favorite-button");
    expect(favButton).not.toBeNull();
    await favButton!.click();
    const store = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("userPrefsV2") ?? "{}");
    });
    expect(store!).to.haveOwnProperty("eventPrefs");
    expect(store!["eventPrefs"]).to.haveOwnProperty(finalEventPrefKey);
    expect(store!["eventPrefs"][finalEventPrefKey]).to.haveOwnProperty(
      "favorite"
    );
    expect(store!["eventPrefs"][finalEventPrefKey]["favorite"]).toBeTruthy();
  });

  it("localstorage updates persist across refresh", async () => {
    await page.goto(URL, { waitUntil: "networkidle2" });
    const eventCards = await page.$$(".event-card");
    const finalEventCard = eventCards[eventCards.length - 1];
    const finalEventAbbrev = await eventCardAbbreviation(finalEventCard);
    const finalEvent = events[finalEventAbbrev];
    const finalEventPrefKey = eventKey(finalEvent);
    const favButton = await finalEventCard.$(".favorite-button");
    expect(favButton).not.toBeNull();
    await favButton!.click();
    await page.reload({ waitUntil: "networkidle2" });
    const store = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("userPrefsV2") ?? "{}");
    });
    expect(store!).to.haveOwnProperty("eventPrefs");
    expect(store!["eventPrefs"]).to.haveOwnProperty(finalEventPrefKey);
    expect(store!["eventPrefs"][finalEventPrefKey]).to.haveOwnProperty(
      "favorite"
    );
    expect(store!["eventPrefs"][finalEventPrefKey]["favorite"]).toBeTruthy();
  });
});
