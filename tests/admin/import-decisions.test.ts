import { describe, expect, it } from "vitest";
import {
  buildCsvImportApplyRows,
  type CsvImportPreview,
  type CsvImportPreviewRow,
} from "@/lib/admin/import-preview";

const baseData: CsvImportPreviewRow["data"] = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  normalizedEmail: "jane@example.com",
  phone: null,
  normalizedPhone: null,
  zipCode: "12207",
  municipality: "Albany",
  engagementStage: "new",
  relationship: "supporter",
  interests: ["events"],
  tags: ["Volunteer"],
  source: "legacy-list",
};

function makePreview(rows: CsvImportPreviewRow[]): CsvImportPreview {
  return { headers: [], mapping: [], rows };
}

describe("CSV import apply decision validation", () => {
  it("never permits an exact-email match to be forced into create-new", () => {
    const preview = makePreview([{
      rowNumber: 2,
      classification: "exact_email_match",
      decision: "update_existing",
      existingPersonId: "20000000-0000-4000-8000-000000001301",
      candidatePersonIds: ["20000000-0000-4000-8000-000000001301"],
      errors: [],
      data: baseData,
    }]);

    expect(() => buildCsvImportApplyRows(preview, [{
      rowNumber: 2,
      decision: "create_new",
      existingPersonId: null,
    }])).toThrow(/exact-email/i);
  });

  it("rejects redirecting an exact-email update to a different supporter", () => {
    const preview = makePreview([{
      rowNumber: 2,
      classification: "exact_email_match",
      decision: "update_existing",
      existingPersonId: "20000000-0000-4000-8000-000000001301",
      candidatePersonIds: ["20000000-0000-4000-8000-000000001301"],
      errors: [],
      data: baseData,
    }]);

    expect(() => buildCsvImportApplyRows(preview, [{
      rowNumber: 2,
      decision: "update_existing",
      existingPersonId: "20000000-0000-4000-8000-000000009999",
    }])).toThrow(/exact-email.*target/i);
  });

  it("allows an ambiguous phone match to update only a fresh preview candidate", () => {
    const candidateId = "20000000-0000-4000-8000-000000001302";
    const preview = makePreview([{
      rowNumber: 3,
      classification: "ambiguous_phone_match",
      decision: "skip",
      existingPersonId: null,
      candidatePersonIds: [candidateId],
      errors: [],
      data: { ...baseData, email: null, normalizedEmail: null, phone: "(518) 555-0130", normalizedPhone: "5185550130" },
    }]);

    const rows = buildCsvImportApplyRows(preview, [{
      rowNumber: 3,
      decision: "update_existing",
      existingPersonId: candidateId,
    }]);
    expect(rows[0]).toMatchObject({ decision: "update_existing", existing_person_id: candidateId });

    expect(() => buildCsvImportApplyRows(preview, [{
      rowNumber: 3,
      decision: "update_existing",
      existingPersonId: "20000000-0000-4000-8000-000000009999",
    }])).toThrow(/candidate/i);
  });

  it("does not allow invalid or newly classified rows to update existing supporters", () => {
    const invalid = makePreview([{
      rowNumber: 4,
      classification: "invalid",
      decision: "skip",
      existingPersonId: null,
      candidatePersonIds: [],
      errors: ["Email address is invalid"],
      data: baseData,
    }]);
    expect(() => buildCsvImportApplyRows(invalid, [{
      rowNumber: 4,
      decision: "create_new",
      existingPersonId: null,
    }])).toThrow(/invalid/i);

    const fresh = makePreview([{
      rowNumber: 5,
      classification: "new",
      decision: "create_new",
      existingPersonId: null,
      candidatePersonIds: [],
      errors: [],
      data: baseData,
    }]);
    expect(() => buildCsvImportApplyRows(fresh, [{
      rowNumber: 5,
      decision: "update_existing",
      existingPersonId: "20000000-0000-4000-8000-000000001301",
    }])).toThrow(/new.*update/i);
  });

  it("rejects stale decisions for row numbers that are no longer in the fresh preview", () => {
    const preview = makePreview([{
      rowNumber: 2,
      classification: "new",
      decision: "create_new",
      existingPersonId: null,
      candidatePersonIds: [],
      errors: [],
      data: baseData,
    }]);

    expect(() => buildCsvImportApplyRows(preview, [{
      rowNumber: 99,
      decision: "skip",
      existingPersonId: null,
    }])).toThrow(/row 99/i);
  });
});
