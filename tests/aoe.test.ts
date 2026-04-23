import { describe, expect, it } from "vitest";
import { toAoeInstant } from "@pl-conf/core";

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
