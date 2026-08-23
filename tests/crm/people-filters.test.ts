import { describe, expect, test } from "vitest";
import { parsePeopleFilters, serializePeopleFilters } from "@/lib/crm/people-filters";

describe("people directory filters", () => {
  test("parses a useful combined organizer search", () => {
    const params = new URLSearchParams({
      q: "  Ada Lovelace  ",
      county: "11111111-1111-4111-8111-111111111111",
      zip: "12207",
      stage: "engaged",
      relationship: "volunteer",
      interest: "local-activism",
      tag: "good-speaker",
      organizer: "22222222-2222-4222-8222-222222222222",
      source: "website-get-involved",
      joinedAfter: "2026-01-01",
      joinedBefore: "2026-08-23",
      inactiveDays: "30",
      openTask: "yes",
      candidateInterest: "yes",
      memberStatus: "member",
    });

    expect(parsePeopleFilters(params)).toEqual({
      query: "Ada Lovelace",
      countyId: "11111111-1111-4111-8111-111111111111",
      zipCode: "12207",
      engagementStage: "engaged",
      relationshipSlug: "volunteer",
      interestSlug: "local-activism",
      tagSlug: "good-speaker",
      organizerId: "22222222-2222-4222-8222-222222222222",
      sourceSlug: "website-get-involved",
      joinedAfter: "2026-01-01",
      joinedBefore: "2026-08-23",
      inactiveDays: 30,
      hasOpenTask: true,
      candidateInterest: true,
      memberStatus: "member",
      page: 1,
    });
  });

  test("drops malformed or unsupported values instead of turning them into broad queries", () => {
    const params = new URLSearchParams({
      county: "not-a-uuid",
      zip: "12A45",
      stage: "super-engaged",
      organizer: "also-not-a-uuid",
      joinedAfter: "yesterday",
      joinedBefore: "2026-99-99",
      inactiveDays: "-5",
      openTask: "maybe",
      candidateInterest: "sometimes",
      memberStatus: "lapsed-ish",
      page: "0",
    });

    expect(parsePeopleFilters(params)).toEqual({
      query: "",
      countyId: null,
      zipCode: null,
      engagementStage: null,
      relationshipSlug: null,
      interestSlug: null,
      tagSlug: null,
      organizerId: null,
      sourceSlug: null,
      joinedAfter: null,
      joinedBefore: null,
      inactiveDays: null,
      hasOpenTask: null,
      candidateInterest: null,
      memberStatus: null,
      page: 1,
    });
  });

  test("round-trips stable URL state while omitting empty defaults", () => {
    const parsed = parsePeopleFilters(
      new URLSearchParams("q=Albany&stage=follow_up_needed&openTask=no&page=3"),
    );

    expect(serializePeopleFilters(parsed).toString()).toBe(
      "q=Albany&stage=follow_up_needed&openTask=no&page=3",
    );
  });
});
