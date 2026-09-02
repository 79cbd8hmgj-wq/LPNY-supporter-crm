import { describe, expect, test } from "vitest";
import { aggregateDashboardCounts, collectPaginatedRows } from "@/lib/crm/dashboard";

describe("collectPaginatedRows", () => {
  test("collects every page when a reporting query reaches the API row cap", async () => {
    const sourceRows = Array.from({ length: 1005 }, (_, index) => ({ id: `row-${index}` }));
    const requestedRanges: Array<[number, number]> = [];

    const result = await collectPaginatedRows(
      async (from, to) => {
        requestedRanges.push([from, to]);
        return {
          data: sourceRows.slice(from, to + 1),
          error: null,
        };
      },
      "dashboard reporting rows",
      1000,
    );

    expect(result).toHaveLength(1005);
    expect(result.at(-1)).toEqual({ id: "row-1004" });
    expect(requestedRanges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });
});

describe("aggregateDashboardCounts", () => {
  test("aggregates only the scoped rows supplied by RLS and counts each person/source pair once", () => {
    const result = aggregateDashboardCounts({
      people: [
        { id: "p1", engagementStage: "new", countyId: "albany" },
        { id: "p2", engagementStage: "contacted", countyId: "albany" },
        { id: "p3", engagementStage: "engaged", countyId: "rensselaer" },
        { id: "p4", engagementStage: "new", countyId: null },
      ],
      counties: [
        { id: "albany", name: "Albany" },
        { id: "rensselaer", name: "Rensselaer" },
      ],
      personSources: [
        { personId: "p1", sourceId: "website" },
        { personId: "p2", sourceId: "website" },
        { personId: "p3", sourceId: "event" },
        { personId: "p3", sourceId: "event" },
      ],
      sources: [
        { id: "website", name: "Get Involved Form" },
        { id: "event", name: "2026 State Convention" },
      ],
    });

    expect(result.totalActiveContacts).toBe(4);
    expect(result.byStage).toEqual([
      { label: "New", count: 2 },
      { label: "Contacted", count: 1 },
      { label: "Engaged", count: 1 },
    ]);
    expect(result.byCounty).toEqual([
      { label: "Albany", count: 2 },
      { label: "Rensselaer", count: 1 },
      { label: "Unresolved", count: 1 },
    ]);
    expect(result.bySource).toEqual([
      { label: "Get Involved Form", count: 2 },
      { label: "2026 State Convention", count: 1 },
    ]);
  });

  test("omits zero-count categories and sorts equal-count labels alphabetically", () => {
    const result = aggregateDashboardCounts({
      people: [
        { id: "p1", engagementStage: "new", countyId: "erie" },
        { id: "p2", engagementStage: "new", countyId: "albany" },
      ],
      counties: [
        { id: "erie", name: "Erie" },
        { id: "albany", name: "Albany" },
        { id: "monroe", name: "Monroe" },
      ],
      personSources: [],
      sources: [],
    });

    expect(result.byCounty).toEqual([
      { label: "Albany", count: 1 },
      { label: "Erie", count: 1 },
    ]);
    expect(result.byStage).toEqual([{ label: "New", count: 2 }]);
    expect(result.bySource).toEqual([]);
  });
});
