import { describe, expect, it } from "vitest";
import {
  parseNewYorkLocalDateTime,
  validateArchiveInput,
  validateContactOutcomeInput,
  validateDoNotContactInput,
  validateFollowUpInput,
  validateNoteInput,
  validateReassignmentInput,
  validateStageInput,
  validateTagToggleInput,
  validateTaskCompletionInput,
  validateTaxonomyToggleInput,
} from "@/lib/crm/organizer-actions";

const PERSON_ID = "20000000-0000-0000-0000-000000000401";
const STAFF_ID = "10000000-0000-0000-0000-000000000404";
const TAG_ID = "30000000-0000-0000-0000-000000000401";
const TASK_ID = "40000000-0000-0000-0000-000000000401";

describe("organizer action input validation", () => {
  it("interprets follow-up wall-clock times in New York across DST", () => {
    expect(parseNewYorkLocalDateTime("2026-08-25T14:00")).toBe("2026-08-25T18:00:00.000Z");
    expect(parseNewYorkLocalDateTime("2026-01-25T14:00")).toBe("2026-01-25T19:00:00.000Z");
    expect(parseNewYorkLocalDateTime("2026-03-08T02:30")).toBeNull();
  });

  it("accepts only valid follow-up identifiers, times, and priorities", () => {
    expect(validateFollowUpInput({ personId: PERSON_ID, dueAt: "2026-08-25T14:00", priority: "high" })).toEqual({
      personId: PERSON_ID,
      dueAt: "2026-08-25T18:00:00.000Z",
      priority: "high",
    });
    expect(validateFollowUpInput({ personId: "not-a-uuid", dueAt: "2026-08-25T14:00", priority: "high" })).toBeNull();
    expect(validateFollowUpInput({ personId: PERSON_ID, dueAt: "2026-08-25T14:00", priority: "urgent" })).toBeNull();
  });

  it("normalizes useful notes and rejects empty or oversized notes", () => {
    expect(validateNoteInput({ personId: PERSON_ID, body: "  Follow up after Labor Day.  " })).toEqual({ personId: PERSON_ID, body: "Follow up after Labor Day." });
    expect(validateNoteInput({ personId: PERSON_ID, body: "   " })).toBeNull();
    expect(validateNoteInput({ personId: PERSON_ID, body: "x".repeat(4001) })).toBeNull();
  });

  it("validates contact outcomes and optional follow-up dates", () => {
    expect(validateContactOutcomeInput({ personId: PERSON_ID, outcome: "unable_to_reach", followUpDueAt: "2026-08-26T09:30" })).toEqual({
      personId: PERSON_ID,
      outcome: "unable_to_reach",
      followUpDueAt: "2026-08-26T13:30:00.000Z",
    });
    expect(validateContactOutcomeInput({ personId: PERSON_ID, outcome: "contacted", followUpDueAt: "" })).toEqual({ personId: PERSON_ID, outcome: "contacted", followUpDueAt: null });
    expect(validateContactOutcomeInput({ personId: PERSON_ID, outcome: "left_voicemail", followUpDueAt: "" })).toBeNull();
  });

  it("limits direct stage changes to known engagement stages", () => {
    expect(validateStageInput({ personId: PERSON_ID, stage: "engaged" })).toEqual({ personId: PERSON_ID, stage: "engaged" });
    expect(validateStageInput({ personId: PERSON_ID, stage: "vip" })).toBeNull();
  });

  it("validates relationship and interest toggles by slug", () => {
    expect(validateTaxonomyToggleInput({ personId: PERSON_ID, slug: "local-activism", enabled: "true" })).toEqual({ personId: PERSON_ID, slug: "local-activism", enabled: true });
    expect(validateTaxonomyToggleInput({ personId: PERSON_ID, slug: "../unsafe", enabled: "true" })).toBeNull();
    expect(validateTaxonomyToggleInput({ personId: PERSON_ID, slug: "volunteer", enabled: "maybe" })).toBeNull();
  });

  it("validates tag, reassignment, task, do-not-contact, and archive identifiers", () => {
    expect(validateTagToggleInput({ personId: PERSON_ID, tagId: TAG_ID, enabled: "false" })).toEqual({ personId: PERSON_ID, tagId: TAG_ID, enabled: false });
    expect(validateReassignmentInput({ personId: PERSON_ID, staffUserId: STAFF_ID })).toEqual({ personId: PERSON_ID, staffUserId: STAFF_ID });
    expect(validateTaskCompletionInput({ personId: PERSON_ID, taskId: TASK_ID })).toEqual({ personId: PERSON_ID, taskId: TASK_ID });
    expect(validateDoNotContactInput({ personId: PERSON_ID, enabled: "true" })).toEqual({ personId: PERSON_ID, enabled: true });
    expect(validateArchiveInput({ personId: PERSON_ID, confirmation: "ARCHIVE" })).toEqual({ personId: PERSON_ID });
    expect(validateTagToggleInput({ personId: PERSON_ID, tagId: "bad", enabled: "false" })).toBeNull();
    expect(validateReassignmentInput({ personId: PERSON_ID, staffUserId: "bad" })).toBeNull();
    expect(validateTaskCompletionInput({ personId: PERSON_ID, taskId: "bad" })).toBeNull();
    expect(validateDoNotContactInput({ personId: PERSON_ID, enabled: "yes" })).toBeNull();
    expect(validateArchiveInput({ personId: PERSON_ID, confirmation: "archive" })).toBeNull();
  });
});
