import { describe, expect, test } from "vitest";
import { buildPeopleDirectoryRpcArgs } from "@/lib/crm/people-directory";
import type { PeopleFilterState } from "@/lib/crm/people-filters";

const baseFilters: PeopleFilterState = {
  query: "",
  countyId: null,
  zipCode: null,
  engagementStage: null,
  relationshipSlug: null,
  interestSlug: null,
  tagId: null,
  organizerId: null,
  sourceSlug: null,
  joinedAfter: null,
  joinedBefore: null,
  inactiveDays: null,
  hasOpenTask: null,
  candidateInterest: null,
  memberStatus: null,
  page: 1,
};

describe("buildPeopleDirectoryRpcArgs", () => {
  test("translates inclusive New York joined dates into safe UTC boundaries", () => {
    const filters: PeopleFilterState = {
      ...baseFilters,
      joinedAfter: "2026-01-01",
      joinedBefore: "2026-08-23",
    };

    const args = buildPeopleDirectoryRpcArgs(filters, new Date("2026-08-23T12:00:00Z"));

    expect(args.p_joined_after).toBe("2026-01-01T05:00:00.000Z");
    expect(args.p_joined_before_exclusive).toBe("2026-08-24T04:00:00.000Z");
  });

  test("uses stable pagination and an exact inactivity threshold", () => {
    const filters: PeopleFilterState = {
      ...baseFilters,
      page: 3,
      inactiveDays: 30,
      hasOpenTask: false,
    };

    const args = buildPeopleDirectoryRpcArgs(filters, new Date("2026-08-23T12:00:00Z"));

    expect(args.p_limit).toBe(25);
    expect(args.p_offset).toBe(50);
    expect(args.p_last_activity_before).toBe("2026-07-24T12:00:00.000Z");
    expect(args.p_has_open_task).toBe(false);
  });
});
