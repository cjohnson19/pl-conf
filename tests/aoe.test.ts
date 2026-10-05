import { describe, expect, it } from "vitest";
import {
  aoeTime,
  calendarDate,
  hasOpenSubmissionAt,
  isDeadlinePast,
} from "@pl-conf/core";
import type { ScheduledEvent } from "@pl-conf/core";

const iso = (ms: number) => new Date(ms).toISOString();

describe("aoeTime", () => {
  it("is 11:59:59.999 UTC on the following day", () => {
    expect(iso(aoeTime("2026/05/01"))).toBe("2026-05-02T11:59:59.999Z");
  });

  it("handles month and year rollover", () => {
    expect(iso(aoeTime("2026/01/31"))).toBe("2026-02-01T11:59:59.999Z");
    expect(iso(aoeTime("2026/12/31"))).toBe("2027-01-01T11:59:59.999Z");
  });
});

describe("calendarDate", () => {
  it("is local midnight of the calendar date", () => {
    const d = calendarDate("2026/05/25");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([
      2026, 4, 25, 0,
    ]);
  });

  it("does not roll the calendar date forward the way aoeTime does", () => {
    // aoeTime("2026/05/25") is 2026-05-25T23:59:59.999-12:00, which in any
    // timezone east of UTC-12 reads as 2026-05-26 on the local calendar.
    expect(calendarDate("2026/05/25").getDate()).toBe(25);
  });
});

describe("isDeadlinePast", () => {
  it("returns false for a deadline whose date matches today (local)", () => {
    // 14:00 UTC on 2026-04-30; local midnight has passed, but AOE has not
    const now = new Date("2026-04-30T14:00:00Z");
    expect(isDeadlinePast("2026/04/30", now)).toBe(false);
  });

  it("returns false for a deadline whose date is yesterday (local) but still before AOE cutoff", () => {
    // 2026-04-30 09:00 UTC: AOE for 2026-04-29 ends at 2026-04-30T11:59:59.999Z
    const now = new Date("2026-04-30T09:00:00Z");
    expect(isDeadlinePast("2026/04/29", now)).toBe(false);
  });

  it("returns true once the AOE cutoff for that date has elapsed", () => {
    const now = new Date("2026-04-30T12:00:00Z");
    expect(isDeadlinePast("2026/04/29", now)).toBe(true);
  });

  it("returns false for TBD", () => {
    expect(isDeadlinePast("TBD", new Date("2030-01-01T00:00:00Z"))).toBe(false);
  });
});

describe("hasOpenSubmissionAt", () => {
  const eventWithDeadline = (paper: string): ScheduledEvent =>
    ({
      name: "X",
      abbreviation: "X",
      type: "conference",
      tags: [],
      date: { start: "2027/01/01", end: "2027/01/02" },
      rounds: [{ importantDates: { paper } }],
      lastUpdated: "2026/01/01",
    }) as unknown as ScheduledEvent;

  it("treats a deadline whose date is today (local) as still open", () => {
    const now = new Date("2026-04-30T14:00:00Z");
    expect(hasOpenSubmissionAt(now)(eventWithDeadline("2026/04/30"))).toBe(
      true
    );
  });

  it("closes once the AOE cutoff has passed", () => {
    const now = new Date("2026-04-30T12:00:00Z");
    expect(hasOpenSubmissionAt(now)(eventWithDeadline("2026/04/29"))).toBe(
      false
    );
  });

  it("stays open while every listed deadline is TBD", () => {
    expect(hasOpenSubmissionAt(new Date())(eventWithDeadline("TBD"))).toBe(
      true
    );
  });
});
