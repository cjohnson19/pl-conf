import { describe, expect, it } from "vitest";
import { pickMultiRoundSlots } from "@/lib/deadline";

describe("pickMultiRoundSlots", () => {
  it("shows previous round done + active when active is not first", () => {
    expect(pickMultiRoundSlots(2, 1)).toEqual({
      left: { idx: 0, status: "done" },
      right: { idx: 1, status: "active" },
    });
  });

  it("shows active + next upcoming round when active is the first round", () => {
    expect(pickMultiRoundSlots(2, 0)).toEqual({
      left: { idx: 0, status: "active" },
      right: { idx: 1, status: "next" },
    });
  });

  it("never labels a later round as done when it has not occurred yet", () => {
    const { left, right } = pickMultiRoundSlots(2, 0);
    expect(left?.status).not.toBe("done");
    expect(right.status).not.toBe("done");
  });

  it("picks the immediately prior round when active is in the middle", () => {
    expect(pickMultiRoundSlots(3, 2)).toEqual({
      left: { idx: 1, status: "done" },
      right: { idx: 2, status: "active" },
    });
  });

  it("returns no left slot when there is only one round", () => {
    expect(pickMultiRoundSlots(1, 0)).toEqual({
      left: null,
      right: { idx: 0, status: "active" },
    });
  });
});
