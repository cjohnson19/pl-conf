import { describe, expect, it } from "vitest";
import type { Round } from "@pl-conf/core";
import {
  pickMultiRoundSlots,
  pickRailSlots,
} from "@/components/event-row/rail-slots";
import {
  datedEntries,
  deadlineStanding,
  isDueThisWeek,
  roundStatuses,
} from "@/lib/deadline";

const round = (importantDates: Round["importantDates"]): Round => ({
  importantDates,
});

const now = new Date("2026-07-12T12:00:00Z");

describe("datedEntries", () => {
  it("flattens every dated entry across rounds, soonest first, skipping TBD", () => {
    const rounds = [
      round({ paper: "2026/06/19", notification: "TBD" }),
      round({ abstract: "2026/04/15", paper: "2026/04/22" }),
    ];
    expect(datedEntries({ rounds }).map((d) => [d.roundIdx, d.name])).toEqual([
      [1, "abstract"],
      [1, "paper"],
      [0, "paper"],
    ]);
  });
});

describe("deadlineStanding", () => {
  it("keeps a deadline open through its last AoE millisecond", () => {
    const rounds = [round({ paper: "2026/07/12" })];
    const lastMs = new Date("2026-07-13T11:59:59.999Z");
    expect(deadlineStanding({ rounds }, lastMs).kind).toBe("upcoming");
    expect(
      deadlineStanding({ rounds }, new Date(lastMs.getTime() + 1)).kind
    ).toBe("closed");
  });

  it("is unlisted only while no date at all is listed", () => {
    expect(
      deadlineStanding({ rounds: [round({ paper: "TBD" })] }, now).kind
    ).toBe("unlisted");
    expect(deadlineStanding({ rounds: [] }, now).kind).toBe("unlisted");
  });
});

describe("isDueThisWeek", () => {
  it("counts deadlines within seven days but not milestones", () => {
    expect(
      isDueThisWeek({ rounds: [round({ paper: "2026/07/15" })] }, now)
    ).toBe(true);
    expect(
      isDueThisWeek({ rounds: [round({ notification: "2026/07/15" })] }, now)
    ).toBe(false);
    expect(
      isDueThisWeek({ rounds: [round({ paper: "2026/07/25" })] }, now)
    ).toBe(false);
  });
});

describe("roundStatuses", () => {
  it("marks a round done only when every date has passed", () => {
    const rounds = [
      round({ paper: "2026/04/15", notification: "2026/05/01" }),
      round({ paper: "2026/06/19", notification: "2026/09/01" }),
    ];
    expect(roundStatuses({ rounds }, now)).toEqual(["done", "active"]);
  });

  it("keeps an earlier round active while its camera-ready is pending, alongside a later active round", () => {
    // Scheme 2026 on July 12: both rounds are mid-flight.
    const rounds = [
      round({
        paper: "2026/06/05",
        notification: "2026/07/01",
        "camera-ready": "2026/07/21",
      }),
      round({
        paper: "2026/06/19",
        notification: "2026/07/14",
        "camera-ready": "2026/07/21",
      }),
    ];
    expect(roundStatuses({ rounds }, now)).toEqual(["active", "active"]);
  });

  it("treats a TBD date as still pending", () => {
    const rounds = [round({ paper: "2026/06/05", notification: "TBD" })];
    expect(roundStatuses({ rounds }, now)).toEqual(["active"]);
  });

  it("marks the first round active and later rounds next before anything passes", () => {
    const rounds = [
      round({ paper: "2026/08/01" }),
      round({ paper: "2026/10/01" }),
    ];
    expect(roundStatuses({ rounds }, now)).toEqual(["active", "next"]);
  });

  it("keeps a round next while any earlier round is still in flight", () => {
    const rounds = [
      round({ paper: "2026/04/15", notification: "2026/05/01" }),
      round({ paper: "2026/06/19", "camera-ready": "2026/08/01" }),
      round({ paper: "2026/10/16" }),
    ];
    expect(roundStatuses({ rounds }, now)).toEqual(["done", "active", "next"]);
  });

  it("activates an untouched round once all earlier rounds are done", () => {
    const rounds = [
      round({ paper: "2026/04/15", notification: "2026/05/01" }),
      round({ paper: "2026/10/16" }),
    ];
    expect(roundStatuses({ rounds }, now)).toEqual(["done", "active"]);
  });
});

describe("pickMultiRoundSlots", () => {
  it("shows both rounds when two are active at once", () => {
    expect(pickMultiRoundSlots(["active", "active"])).toEqual({
      left: { idx: 0, status: "active" },
      right: { idx: 1, status: "active" },
    });
  });

  it("shows the first two active rounds when more than two are active", () => {
    expect(pickMultiRoundSlots(["active", "active", "active"])).toEqual({
      left: { idx: 0, status: "active" },
      right: { idx: 1, status: "active" },
    });
  });

  it("shows previous round done + active when active is not first", () => {
    expect(pickMultiRoundSlots(["done", "active"])).toEqual({
      left: { idx: 0, status: "done" },
      right: { idx: 1, status: "active" },
    });
  });

  it("shows active + next upcoming round when active is the first round", () => {
    expect(pickMultiRoundSlots(["active", "next"])).toEqual({
      left: { idx: 0, status: "active" },
      right: { idx: 1, status: "next" },
    });
  });

  it("picks the immediately prior round when active is in the middle", () => {
    expect(pickMultiRoundSlots(["done", "done", "active"])).toEqual({
      left: { idx: 1, status: "done" },
      right: { idx: 2, status: "active" },
    });
  });

  it("returns no left slot when there is only one round", () => {
    expect(pickMultiRoundSlots(["active"])).toEqual({
      left: null,
      right: { idx: 0, status: "active" },
    });
  });
});

describe("pickRailSlots", () => {
  const rounds = [
    round({ paper: "2026/10/14", notification: "2027/02/12" }),
    round({ paper: "2027/04/07", notification: "2027/08/13" }),
  ];

  it("shows every round before the first deadline has passed", () => {
    expect(pickRailSlots({ rounds }, now)).toEqual({
      left: { idx: 0, status: "active" },
      right: { idx: 1, status: "next" },
    });
  });

  it("shows the last two rounds once every deadline has passed", () => {
    expect(pickRailSlots({ rounds }, new Date("2027-09-01T12:00:00Z"))).toEqual(
      {
        left: { idx: 0, status: "done" },
        right: { idx: 1, status: "done" },
      }
    );
  });

  it("leaves a single-round event to the unlabeled rail", () => {
    expect(pickRailSlots({ rounds: [rounds[0]] }, now)).toBeUndefined();
  });
});
