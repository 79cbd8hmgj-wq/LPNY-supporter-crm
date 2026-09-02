import { z } from "zod";

export const duplicateResolutionSchema = z
  .object({
    candidateId: z.string().uuid(),
    resolution: z.enum(["keep_separate", "merge"]),
    personAId: z.string().uuid(),
    personBId: z.string().uuid(),
    primaryPersonId: z.string().uuid().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.personAId === value.personBId) {
      ctx.addIssue({
        code: "custom",
        path: ["personBId"],
        message: "Duplicate candidates must reference two different people",
      });
    }

    if (value.resolution === "merge") {
      if (!value.primaryPersonId) {
        ctx.addIssue({
          code: "custom",
          path: ["primaryPersonId"],
          message: "Choose the canonical person before merging",
        });
      } else if (
        value.primaryPersonId !== value.personAId
        && value.primaryPersonId !== value.personBId
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["primaryPersonId"],
          message: "The canonical person must be one side of this duplicate candidate",
        });
      }
    }
  });

export type DuplicateResolutionInput = z.infer<typeof duplicateResolutionSchema>;

export type DuplicatePersonRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  zipCode: string | null;
  countyName: string | null;
  municipality: string | null;
  engagementStage: string;
  doNotContact: boolean;
  createdAt: string;
  lastActivityAt: string | null;
};

export type DuplicateCandidateRecord = {
  id: string;
  personAId: string;
  personBId: string;
  reason: string;
  confidence: number | null;
  createdAt: string;
};

export type DuplicateReviewRecord = DuplicateCandidateRecord & {
  personA: DuplicatePersonRecord;
  personB: DuplicatePersonRecord;
};

export type DuplicateActionResult = {
  status: "success" | "error";
  message: string;
};

export function buildDuplicateReviewRecord(
  candidate: DuplicateCandidateRecord,
  people: readonly DuplicatePersonRecord[],
): DuplicateReviewRecord {
  const personA = people.find((person) => person.id === candidate.personAId);
  const personB = people.find((person) => person.id === candidate.personBId);

  if (!personA || !personB) {
    throw new Error("Duplicate candidate references unavailable people");
  }

  return {
    ...candidate,
    personA,
    personB,
  };
}
