import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  hasFutureDeadline,
  isDeadlinePast,
  toAoeInstant,
  toCalendarDate,
} from "@pl-conf/core";
import type { ScheduledEvent } from "@pl-conf/core";

describe("toAoeInstant", () => {
  it("converts a date to 11:59:59.999 UTC on the following day", () => {
    expect(toAoeInstant("2026/05/01")?.toISOString()).toBe(
      "2026-05-02T11:59:59.999Z"
    );
  });

  it("handles month rollover", () => {
    expect(toAoeInstant("2026/01/31")?.toISOString()).toBe(
      "2026-02-01T11:59:59.999Z"
    );
  });

  it("handles year rollover", () => {
    expect(toAoeInstant("2026/12/31")?.toISOString()).toBe(
      "2027-01-01T11:59:59.999Z"
    );
  });

  it("accepts both hyphen- and slash-separated dates", () => {
    expect(toAoeInstant("2026-05-01")?.toISOString()).toBe(
      "2026-05-02T11:59:59.999Z"
    );
  });

  it("returns null for TBD", () => {
    expect(toAoeInstant("TBD")).toBeNull();
  });
});

describe("toCalendarDate", () => {
  it("returns a local-midnight Date whose calendar components match the YAML date", () => {
    const d = toCalendarDate("2026/05/25");
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(4);
    expect(d?.getDate()).toBe(25);
    expect(d?.getHours()).toBe(0);
  });

  it("accepts hyphen-separated dates", () => {
    const d = toCalendarDate("2026-05-25");
    expect(d?.getDate()).toBe(25);
    expect(d?.getMonth()).toBe(4);
  });

  it("does not roll the calendar date forward the way toAoeInstant does", () => {
    // toAoeInstant("2026/05/25") is 2026-05-25T23:59:59.999-12:00, which in
    // any timezone east of UTC-12 reads as 2026-05-26 on the local calendar.
    // toCalendarDate must always read as the 25th regardless of viewer tz.
    expect(toCalendarDate("2026/05/25")?.getDate()).toBe(25);
  });

  it("returns null for TBD", () => {
    expect(toCalendarDate("TBD")).toBeNull();
  });
});

describe("isDeadlinePast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns false for a deadline whose date matches today (local)", () => {
    // 14:00 UTC on 2026-04-30; local midnight has passed, but AOE has not
    vi.setSystemTime(new Date("2026-04-30T14:00:00Z"));
    expect(isDeadlinePast("2026/04/30")).toBe(false);
  });

  it("returns false for a deadline whose date is yesterday (local) but still before AOE cutoff", () => {
    // 2026-04-30 09:00 UTC: AOE for 2026-04-29 ends at 2026-04-30T11:59:59.999Z
    vi.setSystemTime(new Date("2026-04-30T09:00:00Z"));
    expect(isDeadlinePast("2026/04/29")).toBe(false);
  });

  it("returns true once the AOE cutoff for that date has elapsed", () => {
    vi.setSystemTime(new Date("2026-04-30T12:00:00Z"));
    expect(isDeadlinePast("2026/04/29")).toBe(true);
  });

  it("returns false for TBD", () => {
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    expect(isDeadlinePast("TBD")).toBe(false);
  });
});

describe("hasFutureDeadline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

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

  it("treats a deadline whose date is today (local) as a future deadline", () => {
    vi.setSystemTime(new Date("2026-04-30T14:00:00Z"));
    expect(hasFutureDeadline(eventWithDeadline("2026/04/30"))).toBe(true);
  });

  it("returns false once the AOE cutoff has passed", () => {
    vi.setSystemTime(new Date("2026-04-30T12:00:00Z"));
    expect(hasFutureDeadline(eventWithDeadline("2026/04/29"))).toBe(false);
  });
});
