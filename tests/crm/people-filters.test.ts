import { describe, expect, test } from "vitest";
import {
  normalizePeopleSearchQuery,
  parsePeopleFilters,
  serializePeopleFilters,
} from "@/lib/crm/people-filters";

describe("people directory filters", () => {
  test("parses useful structured organizer filters without accepting free-text PII from the URL", () => {
    const params = new URLSearchParams({
      q: "  Ada Lovelace  ",
      county: "11111111-1111-4111-8111-111111111111",
      zip: "12207",
      stage: "engaged",
      relationship: "volunteer",
      interest: "local-activism",
      tag: "33333333-3333-4333-8333-333333333333",
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
      query: "",
      countyId: "11111111-1111-4111-8111-111111111111",
      zipCode: "12207",
      engagementStage: "engaged",
      relationshipSlug: "volunteer",
      interestSlug: "local-activism",
      tagId: "33333333-3333-4333-8333-333333333333",
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

  test("normalizes private free-text search before server-side storage", () => {
    expect(normalizePeopleSearchQuery("  Ada   Lovelace  ")).toBe("Ada Lovelace");
    expect(normalizePeopleSearchQuery("x".repeat(250))).toHaveLength(200);
  });

  test("drops malformed or unsupported values instead of turning them into broad queries", () => {
    const params = new URLSearchParams({
      county: "not-a-uuid",
      zip: "12A45",
      stage: "super-engaged",
      tag: "good-speaker",
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
    });
  });

  test("never serializes free-text contact search into a URL", () => {
    const parsed = parsePeopleFilters(
      new URLSearchParams("stage=follow_up_needed&openTask=no&page=3"),
    );

    const serialized = serializePeopleFilters({
      ...parsed,
      query: "ada@example.com",
    }).toString();
    expect(serialized).toBe("search=1&stage=follow_up_needed&openTask=no&page=3");
    expect(serialized).not.toContain("ada%40example.com");
  });

  test("round-trips stable structured URL state while omitting empty defaults", () => {
    const parsed = parsePeopleFilters(
      new URLSearchParams("stage=follow_up_needed&openTask=no&page=3"),
    );

    expect(serializePeopleFilters(parsed).toString()).toBe(
      "stage=follow_up_needed&openTask=no&page=3",
    );
  });
});
