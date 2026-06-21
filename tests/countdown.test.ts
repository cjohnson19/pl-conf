import { describe, expect, it } from "vitest";
import { humanCountdown, shortCountdown } from "@/lib/countdown";
import { toAoeInstant } from "@pl-conf/core";

// UTC noon so the assertions don't depend on the runner's local tz.
const localNoon = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

describe("shortCountdown", () => {
  it("returns TBD for TBD", () => {
    expect(shortCountdown("TBD", localNoon(2026, 5, 12))).toBe("TBD");
  });

  it('renders "1d" when the deadline calendar date is tomorrow', () => {
    expect(shortCountdown("2026-05-13", localNoon(2026, 5, 12))).toBe("1d");
  });

  it('renders "Nd" for calendar days < 14', () => {
    expect(shortCountdown("2026-05-19", localNoon(2026, 5, 12))).toBe("7d");
  });

  it("switches to weeks at 14 days and below 36", () => {
    expect(shortCountdown("2026-05-26", localNoon(2026, 5, 12))).toBe("2w");
    expect(shortCountdown("2026-06-15", localNoon(2026, 5, 12))).toBe("4w");
  });

  it("switches to months for 36 days up to a year", () => {
    expect(shortCountdown("2026-07-12", localNoon(2026, 5, 12))).toBe("2mo");
  });

  it("switches to years beyond a year", () => {
    expect(shortCountdown("2028-05-12", localNoon(2026, 5, 12))).toBe("2y");
  });

  it("falls into AoE hours when the deadline calendar date is today", () => {
    // 3 hours before AoE on 2026-05-12 (AoE = 2026-05-13T11:59:59.999Z)
    const aoe = toAoeInstant("2026-05-12")!;
    const now = new Date(aoe.getTime() - 3 * 3_600_000);
    expect(shortCountdown("2026-05-12", now)).toBe("3h");
  });

  it('returns "<1h" when under an hour to AoE', () => {
    const aoe = toAoeInstant("2026-05-12")!;
    const now = new Date(aoe.getTime() - 15 * 60_000);
    expect(shortCountdown("2026-05-12", now)).toBe("<1h");
  });

  it("caps the AoE-hours branch within a single AoE day", () => {
    // Just after the deadline's AoE day begins (UTC-12), the hours branch can
    // report at most one AoE day — never the 30h+ the old UTC-calendar anchor
    // produced for the same instant, which was the source of the inconsistency.
    const aoeDayStart = new Date(
      toAoeInstant("2026-05-12")!.getTime() - 24 * 3_600_000 + 60_000
    );
    const result = shortCountdown("2026-05-12", aoeDayStart);
    expect(result).toMatch(/^\d+h$/);
    expect(Number(result.replace("h", ""))).toBeLessThanOrEqual(24);
  });

  it('returns "passed" once the AoE instant has elapsed', () => {
    const aoe = toAoeInstant("2026-05-12")!;
    const now = new Date(aoe.getTime() + 1_000);
    expect(shortCountdown("2026-05-12", now)).toBe("passed");
  });
});

describe("humanCountdown", () => {
  it('returns "tomorrow" when the deadline calendar date is the next day', () => {
    expect(humanCountdown("2026-05-13", localNoon(2026, 5, 12))).toBe(
      "tomorrow"
    );
  });

  it('renders "in N days" for the < 14 day range', () => {
    expect(humanCountdown("2026-05-19", localNoon(2026, 5, 12))).toBe(
      "in 7 days"
    );
  });

  it("renders weeks between 14 and 60 calendar days", () => {
    expect(humanCountdown("2026-05-26", localNoon(2026, 5, 12))).toBe(
      "in 2 weeks"
    );
  });

  it("renders months between 60 and 365 calendar days", () => {
    expect(humanCountdown("2026-08-12", localNoon(2026, 5, 12))).toBe(
      "in 3 months"
    );
  });

  it("renders years beyond a year", () => {
    expect(humanCountdown("2028-05-12", localNoon(2026, 5, 12))).toBe(
      "in 2 years"
    );
  });

  it("uses singular year form", () => {
    expect(humanCountdown("2027-05-12", localNoon(2026, 5, 12))).toBe(
      "in 1 year"
    );
  });

  it("falls into AoE hours when the deadline calendar date is today", () => {
    const aoe = toAoeInstant("2026-05-12")!;
    const now = new Date(aoe.getTime() - 3 * 3_600_000);
    expect(humanCountdown("2026-05-12", now)).toBe("in 3 hours");
  });

  it("combines hours and minutes", () => {
    const aoe = toAoeInstant("2026-05-12")!;
    const now = new Date(aoe.getTime() - (3 * 3_600_000 + 15 * 60_000));
    expect(humanCountdown("2026-05-12", now)).toBe("in 3 hours 15 minutes");
  });

  it("uses minutes alone when under an hour", () => {
    const aoe = toAoeInstant("2026-05-12")!;
    const now = new Date(aoe.getTime() - 12 * 60_000);
    expect(humanCountdown("2026-05-12", now)).toBe("in 12 minutes");
  });

  it("uses singular hour/minute forms", () => {
    const aoe = toAoeInstant("2026-05-12")!;
    const now1h = new Date(aoe.getTime() - 1 * 3_600_000);
    expect(humanCountdown("2026-05-12", now1h)).toBe("in 1 hour");
    const now1m = new Date(aoe.getTime() - 60_000);
    expect(humanCountdown("2026-05-12", now1m)).toBe("in 1 minute");
  });

  it('returns "soon" for TBD', () => {
    expect(humanCountdown("TBD", localNoon(2026, 5, 12))).toBe("soon");
  });

  it("yields the same text regardless of how a viewer would localize now", () => {
    // 2026-05-27T02:00Z is May 26 on the AoE (UTC-12) clock, and the deadline's
    // AoE instant is ~4.4 days out — so "in 4 days" regardless of viewer tz.
    const date = "2026-05-30";
    const instant = new Date("2026-05-27T02:00:00Z");
    expect(humanCountdown(date, instant)).toBe("in 4 days");
  });

  // Regression: 2026-06-20 21:58 local (UTC-5) = 2026-06-21T02:58Z. It is the
  // evening of the 20th for the viewer, but already the 21st in UTC. The day
  // count must be anchored to the same AOE (UTC-12) clock the hours branch
  // counts down to.
  describe("AOE day boundary (evening before UTC rollover)", () => {
    const now = new Date("2026-06-21T02:58:30Z");

    it('keeps the current AOE day in hours, not "tomorrow"', () => {
      expect(humanCountdown("2026-06-20", now)).toBe("in 9 hours 1 minute");
    });

    it('reads the next AOE day as "tomorrow"', () => {
      expect(humanCountdown("2026-06-21", now)).toBe("tomorrow");
    });

    it('reads two AOE days out as "in 2 days", not "tomorrow"', () => {
      expect(humanCountdown("2026-06-22", now)).toBe("in 2 days");
    });

    it('reads three AOE days out as "in 3 days"', () => {
      expect(humanCountdown("2026-06-23", now)).toBe("in 3 days");
    });
  });
});
