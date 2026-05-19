// Test fixtures for e2e tests. Authored as raw inputs and parsed through the
// real ScheduledEvent Zod schema, so any schema/preprocessor regression that
// would break real YAML data also breaks these fixtures.
//
// Dates are anchored to FROZEN_NOW (see tests/e2e.test.ts). Edit them together.

import { eventKey } from "@pl-conf/core";
import { ScheduledEvent } from "@pl-conf/core/schemas";

const rawEvents = [
  {
    name: "Mock Multi-Round Conference",
    abbreviation: "MOCKA",
    type: "conference",
    date: { start: "2027-01-15", end: "2027-01-19" },
    location: "Atlantis, AT",
    importantDateUrl: "https://example.com/mocka/dates",
    url: "https://example.com/mocka",
    tags: ["types", "verification"],
    rounds: [
      {
        name: "Round 1",
        importantDates: {
          paper: "2026-04-15",
          notification: "2026-05-01",
        },
      },
      {
        name: "Round 2",
        importantDates: {
          paper: "2026-07-15",
          notification: "2026-09-01",
        },
      },
    ],
    lastUpdated: "2026-01-01",
    sequence: 0,
  },
  {
    name: "Mock Near-Deadline Conference",
    abbreviation: "MOCKB",
    type: "conference",
    date: { start: "2026-11-01", end: "2026-11-05" },
    location: "Borgo, BG",
    importantDateUrl: "https://example.com/mockb/dates",
    url: "https://example.com/mockb",
    tags: ["semantics"],
    importantDates: {
      paper: "2026-06-10",
      notification: "2026-08-01",
    },
    lastUpdated: "2026-01-01",
    sequence: 0,
  },
  {
    name: "Mock Far Workshop",
    abbreviation: "MOCKC",
    type: "workshop",
    date: { start: "2027-03-01", end: "2027-03-02" },
    location: "Coruscant, CR",
    importantDateUrl: "https://example.com/mockc/dates",
    url: "https://example.com/mockc",
    tags: ["types"],
    importantDates: {
      paper: "2026-10-01",
    },
    lastUpdated: "2026-01-01",
    sequence: 0,
  },
  {
    name: "Mock No-Deadline Symposium",
    abbreviation: "MOCKD",
    type: "symposium",
    date: { start: "2026-09-10", end: "2026-09-12" },
    location: "Dorne, DR",
    url: "https://example.com/mockd",
    lastUpdated: "2026-01-01",
    sequence: 0,
  },
];

export const events: Record<string, ScheduledEvent> = Object.fromEntries(
  rawEvents.map((r) => ScheduledEvent.parse(r)).map((e) => [eventKey(e), e])
);
