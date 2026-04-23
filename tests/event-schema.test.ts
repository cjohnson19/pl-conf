import { describe, expect, it } from "vitest";
import { ScheduledEvent } from "@pl-conf/core";

const baseEvent = {
  name: "Test Conference",
  abbreviation: "TEST",
  type: "conference" as const,
  importantDateUrl: "https://example.com/cfp",
  lastUpdated: "2026-01-01",
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
      lastUpdated: "2026-01-01",
    });
    expect(parsed.rounds).toEqual([]);
  });

  it("requires importantDateUrl when any round has deadlines", () => {
    const res = ScheduledEvent.safeParse({
      name: "NoUrl",
      abbreviation: "NOURL",
      type: "conference",
      lastUpdated: "2026-01-01",
      rounds: [{ importantDates: { paper: "2026-05-01" } }],
    });
    expect(res.success).toBe(false);
  });
});
