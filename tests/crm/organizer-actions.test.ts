import { describe, expect, it } from "vitest";
import {
  parseNewYorkLocalDateTime,
  validateFollowUpInput,
  validateNoteInput,
} from "@/lib/crm/organizer-actions";

const PERSON_ID = "20000000-0000-0000-0000-000000000401";

describe("organizer action input validation", () => {
  it("interprets follow-up wall-clock times in New York across DST", () => {
    expect(parseNewYorkLocalDateTime("2026-08-25T14:00")).toBe("2026-08-25T18:00:00.000Z");
    expect(parseNewYorkLocalDateTime("2026-01-25T14:00")).toBe("2026-01-25T19:00:00.000Z");
    expect(parseNewYorkLocalDateTime("2026-03-08T02:30")).toBeNull();
  });

  it("accepts only valid follow-up identifiers, times, and priorities", () => {
    expect(validateFollowUpInput({
      personId: PERSON_ID,
      dueAt: "2026-08-25T14:00",
      priority: "high",
    })).toEqual({
      personId: PERSON_ID,
      dueAt: "2026-08-25T18:00:00.000Z",
      priority: "high",
    });

    expect(validateFollowUpInput({
      personId: "not-a-uuid",
      dueAt: "2026-08-25T14:00",
      priority: "high",
    })).toBeNull();

    expect(validateFollowUpInput({
      personId: PERSON_ID,
      dueAt: "2026-08-25T14:00",
      priority: "urgent",
    })).toBeNull();
  });

  it("normalizes useful notes and rejects empty or oversized notes", () => {
    expect(validateNoteInput({ personId: PERSON_ID, body: "  Follow up after Labor Day.  " })).toEqual({
      personId: PERSON_ID,
      body: "Follow up after Labor Day.",
    });
    expect(validateNoteInput({ personId: PERSON_ID, body: "   " })).toBeNull();
    expect(validateNoteInput({ personId: PERSON_ID, body: "x".repeat(4001) })).toBeNull();
  });
});
