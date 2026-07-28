import { describe, expect, it } from "vitest";
import { eventKey, eventPath } from "@pl-conf/core";
import { ScheduledEvent } from "@pl-conf/core/schemas";

const baseEvent = {
  name: "Test Conference",
  abbreviation: "TEST",
  type: "conference" as const,
  importantDateUrl: "https://example.com/cfp",
  year: 2026,
  lastUpdated: "2026-01-01",
  sequence: 0,
};

describe("ScheduledEvent schema", () => {
  it("normalizes flat importantDates into a single anonymous round", () => {
    const parsed = ScheduledEvent.parse({
      ...baseEvent,
      importantDates: {
        paper: "2026-05-01",
        notification: "2026-07-01",
      },
    });

    expect(parsed.rounds).toHaveLength(1);
    expect(parsed.rounds[0].name).toBeUndefined();
    expect(parsed.rounds[0].importantDates).toEqual({
      paper: "2026/05/01",
      notification: "2026/07/01",
    });
  });

  it("accepts a rounds-form event with names preserved", () => {
    const parsed = ScheduledEvent.parse({
      ...baseEvent,
      rounds: [
        {
          name: "Round 1",
          importantDates: { paper: "2025-06-03", notification: "2025-08-01" },
        },
        {
          name: "Round 2",
          importantDates: { paper: "2025-10-16" },
        },
      ],
    });

    expect(parsed.rounds.map((r) => r.name)).toEqual(["Round 1", "Round 2"]);
    expect(parsed.rounds[0].importantDates.paper).toBe("2025/06/03");
  });

  it("rejects specifying both importantDates and rounds", () => {
    const res = ScheduledEvent.safeParse({
      ...baseEvent,
      importantDates: { paper: "2026-05-01" },
      rounds: [{ name: "Round 1", importantDates: { paper: "2026-05-01" } }],
    });
    expect(res.success).toBe(false);
  });

  it("defaults to an empty rounds array when no dates are given", () => {
    const parsed = ScheduledEvent.parse({
      name: "Empty",
      abbreviation: "EMPTY",
      type: "conference",
      year: 2026,
      lastUpdated: "2026-01-01",
      sequence: 0,
    });
    expect(parsed.rounds).toEqual([]);
  });

  it("requires importantDateUrl when any round has deadlines", () => {
    const res = ScheduledEvent.safeParse({
      name: "NoUrl",
      abbreviation: "NOURL",
      type: "conference",
      year: 2026,
      lastUpdated: "2026-01-01",
      sequence: 0,
      rounds: [{ importantDates: { paper: "2026-05-01" } }],
    });
    expect(res.success).toBe(false);
  });

  it("defaults partOf and colocatedWith to empty arrays", () => {
    const parsed = ScheduledEvent.parse({
      ...baseEvent,
      importantDates: { paper: "2026-05-01" },
    });
    expect(parsed.partOf).toEqual([]);
    expect(parsed.colocatedWith).toEqual([]);
  });

  it("accepts a single string for partOf and normalizes to array", () => {
    const parsed = ScheduledEvent.parse({
      ...baseEvent,
      importantDates: { paper: "2026-05-01" },
      partOf: "FLOC",
      colocatedWith: ["CAV", "FSCD"],
    });
    expect(parsed.partOf).toEqual(["FLOC"]);
    expect(parsed.colocatedWith).toEqual(["CAV", "FSCD"]);
  });

  it("keys and routes a TBD-dated event off its declared year", () => {
    const parsed = ScheduledEvent.parse({
      ...baseEvent,
      date: { start: "TBD", end: "TBD" },
      importantDates: { paper: "2026-07-10" },
    });
    expect(eventKey(parsed)).toBe("TEST-2026");
    expect(eventPath(parsed)).toBe("/event/2026/test/");
  });

  it("rejects concrete dates falling outside the declared year", () => {
    const res = ScheduledEvent.safeParse({
      ...baseEvent,
      date: { start: "2027-01-15", end: "2027-01-19" },
    });
    expect(res.success).toBe(false);
  });

  it("requires a year", () => {
    const { year, ...withoutYear } = baseEvent;
    const res = ScheduledEvent.safeParse(withoutYear);
    expect(res.success).toBe(false);
  });
});
