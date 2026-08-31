import { describe, expect, it } from "vitest";
import {
  previewCsvImport,
  type CsvColumnMapping,
  type ImportMatchPerson,
} from "@/lib/admin/import-preview";

const mapping: CsvColumnMapping = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "zip_code",
  "engagement_stage",
];

const existingPeople: ImportMatchPerson[] = [
  {
    id: "20000000-0000-4000-8000-000000001001",
    firstName: "Jane",
    lastName: "Doe",
    normalizedEmail: "jane@example.com",
    normalizedPhone: "15185550101",
  },
  {
    id: "20000000-0000-4000-8000-000000001002",
    firstName: "Janet",
    lastName: "Doe",
    normalizedEmail: "janet@example.com",
    normalizedPhone: "15185550102",
  },
];

describe("CSV import preview", () => {
  it("classifies an exact normalized email match and defaults to updating that person", () => {
    const preview = previewCsvImport(
      "First,Last,Email,Phone,ZIP,Stage\n Jane , Doe , JANE@EXAMPLE.COM , ,12207,new",
      mapping,
      existingPeople,
    );

    expect(preview.rows[0]).toMatchObject({
      classification: "exact_email_match",
      decision: "update_existing",
      existingPersonId: existingPeople[0].id,
    });
  });

  it("classifies phone plus last-name matches as ambiguous and defaults to skip", () => {
    const preview = previewCsvImport(
      "First,Last,Email,Phone,ZIP,Stage\nJanie,Doe,,(518) 555-0102,12207,engaged",
      mapping,
      existingPeople,
    );

    expect(preview.rows[0]).toMatchObject({
      classification: "ambiguous_phone_match",
      decision: "skip",
    });
    expect(preview.rows[0].candidatePersonIds).toEqual([existingPeople[1].id]);
  });

  it("marks rows invalid when names/contact requirements are not satisfied", () => {
    const preview = previewCsvImport(
      "First,Last,Email,Phone,ZIP,Stage\n,Doe,,,12207,new",
      mapping,
      [],
    );

    expect(preview.rows[0].classification).toBe("invalid");
    expect(preview.rows[0].errors.join(" ")).toMatch(/first name/i);
    expect(preview.rows[0].errors.join(" ")).toMatch(/email or phone/i);
  });

  it("marks invalid ZIP codes and engagement stages without applying the row", () => {
    const preview = previewCsvImport(
      "First,Last,Email,Phone,ZIP,Stage\nAlex,Smith,alex@example.com,,12A45,prospect",
      mapping,
      [],
    );

    expect(preview.rows[0]).toMatchObject({
      classification: "invalid",
      decision: "skip",
    });
    expect(preview.rows[0].errors.join(" ")).toMatch(/ZIP/i);
    expect(preview.rows[0].errors.join(" ")).toMatch(/engagement stage/i);
  });

  it("rejects mapping more than one input column to the same canonical field", () => {
    expect(() => previewCsvImport(
      "First,Nickname,Last,Email\nJane,Janie,Doe,jane@example.com",
      ["first_name", "first_name", "last_name", "email"],
      [],
    )).toThrow(/mapped more than once/i);
  });

  it("classifies a valid unmatched row as new and defaults to create-new", () => {
    const preview = previewCsvImport(
      "First,Last,Email,Phone,ZIP,Stage\nAlex,Smith,alex@example.com,,12207,follow_up_needed",
      mapping,
      [],
    );

    expect(preview.rows[0]).toMatchObject({
      classification: "new",
      decision: "create_new",
      existingPersonId: null,
    });
  });
});
