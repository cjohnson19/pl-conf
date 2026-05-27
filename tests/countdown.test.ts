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

  it("returns hours even when result exceeds 24 (calendar same day, deep east of AoE)", () => {
    // 30 hours before AoE — calendar-day-of-now will be a day or two earlier
    // in most timezones, but the helper should still report hours since it
    // hits the days <= 0 branch only when calendar diff <= 0. To force the
    // same-calendar-day case, pin now to local midnight of the same day.
    const sameDayLocalMidnight = new Date(Date.UTC(2026, 4, 12, 0, 0, 0));
    const result = shortCountdown("2026-05-12", sameDayLocalMidnight);
    expect(result).toMatch(/^\d+h$/);
    expect(Number(result.replace("h", ""))).toBeGreaterThan(0);
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
    const date = "2026-05-30";
    const wouldBeMay27Utc = new Date("2026-05-27T02:00:00Z");
    expect(humanCountdown(date, wouldBeMay27Utc)).toBe("in 3 days");
  });
});
