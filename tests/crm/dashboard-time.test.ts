import { describe, expect, test } from "vitest";
import { getNewYorkDayRange } from "@/lib/crm/dashboard-time";

describe("getNewYorkDayRange", () => {
  test("uses the New York calendar day during daylight saving time", () => {
    const now = new Date("2026-08-23T12:30:00.000Z");

    expect(getNewYorkDayRange(now)).toEqual({
      startIso: "2026-08-23T04:00:00.000Z",
      endIso: "2026-08-24T04:00:00.000Z",
    });
  });

  test("uses the New York calendar day during standard time", () => {
    const now = new Date("2026-12-15T15:00:00.000Z");

    expect(getNewYorkDayRange(now)).toEqual({
      startIso: "2026-12-15T05:00:00.000Z",
      endIso: "2026-12-16T05:00:00.000Z",
    });
  });

  test("handles the spring daylight-saving transition without assuming a 24-hour day", () => {
    const now = new Date("2026-03-08T16:00:00.000Z");

    expect(getNewYorkDayRange(now)).toEqual({
      startIso: "2026-03-08T05:00:00.000Z",
      endIso: "2026-03-09T04:00:00.000Z",
    });
  });
});
