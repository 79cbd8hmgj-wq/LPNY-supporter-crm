import { describe, expect, test } from "vitest";
import {
  decodeSavedViewFilters,
  encodeSavedViewFilters,
} from "@/lib/crm/saved-views";
import { parsePeopleFilters } from "@/lib/crm/people-filters";

describe("saved people views", () => {
  test("stores canonical filter state and private search without pagination or URL markers", () => {
    const structured = parsePeopleFilters(
      new URLSearchParams(
        "stage=follow_up_needed&openTask=yes&inactiveDays=30&page=4",
      ),
    );
    const filters = { ...structured, query: "Albany" };

    expect(encodeSavedViewFilters(filters)).toEqual({
      q: "Albany",
      stage: "follow_up_needed",
      inactiveDays: "30",
      openTask: "yes",
    });
  });

  test("revalidates stored JSON and drops unsupported values when applying a view", () => {
    expect(
      decodeSavedViewFilters({
        q: "Albany",
        stage: "not-a-stage",
        openTask: "yes",
        county: "not-a-uuid",
        unexpected: "ignored",
        page: "99",
      }),
    ).toEqual(
      expect.objectContaining({
        query: "Albany",
        engagementStage: null,
        countyId: null,
        hasOpenTask: true,
        page: 1,
      }),
    );
  });

  test("rejects non-object stored filter payloads", () => {
    expect(decodeSavedViewFilters(["q=Albany"])).toBeNull();
    expect(decodeSavedViewFilters("q=Albany")).toBeNull();
  });
});
