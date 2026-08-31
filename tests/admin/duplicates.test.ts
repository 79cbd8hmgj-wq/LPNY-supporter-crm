import { describe, expect, it } from "vitest";
import {
  buildDuplicateReviewRecord,
  duplicateResolutionSchema,
} from "@/lib/admin/duplicates";

const candidateId = "50000000-0000-0000-0000-000000000901";
const personAId = "20000000-0000-0000-0000-000000000901";
const personBId = "20000000-0000-0000-0000-000000000902";
const otherPersonId = "20000000-0000-0000-0000-000000000903";

describe("duplicate resolution validation", () => {
  it("accepts keep-separate without a canonical person", () => {
    const parsed = duplicateResolutionSchema.safeParse({
      candidateId,
      resolution: "keep_separate",
      personAId,
      personBId,
      primaryPersonId: null,
    });

    expect(parsed.success).toBe(true);
  });

  it("requires a canonical person for merge", () => {
    const parsed = duplicateResolutionSchema.safeParse({
      candidateId,
      resolution: "merge",
      personAId,
      personBId,
      primaryPersonId: null,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects a canonical person that is not one side of the candidate", () => {
    const parsed = duplicateResolutionSchema.safeParse({
      candidateId,
      resolution: "merge",
      personAId,
      personBId,
      primaryPersonId: otherPersonId,
    });

    expect(parsed.success).toBe(false);
  });
});

describe("duplicate review mapping", () => {
  it("keeps candidate sides attached to the correct person", () => {
    const review = buildDuplicateReviewRecord(
      {
        id: candidateId,
        personAId,
        personBId,
        reason: "same normalized phone",
        confidence: 0.91,
        createdAt: "2026-08-31T12:00:00.000Z",
      },
      [
        {
          id: personBId,
          firstName: "Secondary",
          lastName: "Person",
          email: "secondary@test.local",
          phone: "518-555-0102",
          zipCode: "12207",
          countyName: "Albany",
          municipality: "Albany",
          engagementStage: "engaged",
          doNotContact: true,
          createdAt: "2026-08-30T12:00:00.000Z",
          lastActivityAt: null,
        },
        {
          id: personAId,
          firstName: "Primary",
          lastName: "Person",
          email: null,
          phone: null,
          zipCode: null,
          countyName: null,
          municipality: null,
          engagementStage: "new",
          doNotContact: false,
          createdAt: "2026-08-29T12:00:00.000Z",
          lastActivityAt: null,
        },
      ],
    );

    expect(review.personA.id).toBe(personAId);
    expect(review.personA.firstName).toBe("Primary");
    expect(review.personB.id).toBe(personBId);
    expect(review.personB.firstName).toBe("Secondary");
  });

  it("fails closed when one candidate person is missing", () => {
    expect(() => buildDuplicateReviewRecord(
      {
        id: candidateId,
        personAId,
        personBId,
        reason: "fixture",
        confidence: null,
        createdAt: "2026-08-31T12:00:00.000Z",
      },
      [],
    )).toThrow("Duplicate candidate references unavailable people");
  });
});
