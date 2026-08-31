import { z } from "zod";
import { normalizeEmail, normalizeName, normalizePhone } from "@/lib/intake/normalize";
import { parseCsv } from "./csv";

export const canonicalImportFields = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "zip_code",
  "municipality",
  "engagement_stage",
  "relationship",
  "interests",
  "tags",
  "source",
] as const;

export type CanonicalImportField = (typeof canonicalImportFields)[number];
export type CsvColumnMapping = readonly (CanonicalImportField | null)[];

export type ImportMatchPerson = {
  id: string;
  firstName: string;
  lastName: string;
  normalizedEmail: string | null;
  normalizedPhone: string | null;
};

export type CsvImportClassification =
  | "new"
  | "exact_email_match"
  | "ambiguous_phone_match"
  | "invalid";

export type CsvImportDecision = "create_new" | "update_existing" | "skip";

export type CsvImportRowData = {
  firstName: string;
  lastName: string;
  email: string | null;
  normalizedEmail: string | null;
  phone: string | null;
  normalizedPhone: string | null;
  zipCode: string | null;
  municipality: string | null;
  engagementStage: "new" | "follow_up_needed" | "contacted" | "engaged" | "inactive";
  relationship: string | null;
  interests: string[];
  tags: string[];
  source: string | null;
};

export type CsvImportPreviewRow = {
  rowNumber: number;
  classification: CsvImportClassification;
  decision: CsvImportDecision;
  existingPersonId: string | null;
  candidatePersonIds: string[];
  errors: string[];
  data: CsvImportRowData;
};

export type CsvImportPreview = {
  headers: string[];
  mapping: CsvColumnMapping;
  rows: CsvImportPreviewRow[];
};

export type CsvImportDecisionSelection = {
  rowNumber: number;
  decision: CsvImportDecision;
  existingPersonId: string | null;
};

export type CsvImportApplyRow = {
  row_number: number;
  decision: CsvImportDecision;
  existing_person_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  normalized_email: string | null;
  phone: string | null;
  normalized_phone: string | null;
  zip_code: string | null;
  county_name: string | null;
  municipality: string | null;
  engagement_stage: CsvImportRowData["engagementStage"];
  relationship: string | null;
  interests: string[];
  tags: string[];
  source: string | null;
};

const emailSchema = z.string().email().max(254);
const engagementStages = new Set<CsvImportRowData["engagementStage"]>([
  "new",
  "follow_up_needed",
  "contacted",
  "engaged",
  "inactive",
]);

function validPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function comparableName(value: string): string {
  return normalizeName(value).toLocaleLowerCase("en-US");
}

function splitMultiValue(value: string): string[] {
  return value
    .split(/[;|]/)
    .map((part) => normalizeName(part))
    .filter(Boolean);
}

function assertValidMapping(headers: readonly string[], mapping: CsvColumnMapping): void {
  if (mapping.length !== headers.length) {
    throw new Error("CSV mapping must include one selection for every input column");
  }

  const selected = mapping.filter((field): field is CanonicalImportField => field !== null);
  const seen = new Set<CanonicalImportField>();
  for (const field of selected) {
    if (seen.has(field)) {
      throw new Error(`Canonical field ${field} is mapped more than once`);
    }
    seen.add(field);
  }

  if (!seen.has("first_name") || !seen.has("last_name")) {
    throw new Error("CSV mapping must include first_name and last_name");
  }
  if (!seen.has("email") && !seen.has("phone")) {
    throw new Error("CSV mapping must include email or phone");
  }
}

function readMappedCell(
  row: readonly string[],
  mapping: CsvColumnMapping,
  field: CanonicalImportField,
): string {
  const index = mapping.indexOf(field);
  if (index < 0) return "";
  return row[index]?.trim() ?? "";
}

function buildRowData(row: readonly string[], mapping: CsvColumnMapping): {
  data: CsvImportRowData;
  errors: string[];
} {
  const errors: string[] = [];
  const firstName = normalizeName(readMappedCell(row, mapping, "first_name"));
  const lastName = normalizeName(readMappedCell(row, mapping, "last_name"));
  const emailValue = readMappedCell(row, mapping, "email");
  const phoneValue = readMappedCell(row, mapping, "phone");
  const zipValue = readMappedCell(row, mapping, "zip_code");
  const stageValue = readMappedCell(row, mapping, "engagement_stage") || "new";

  if (!firstName) errors.push("First name is required");
  else if (firstName.length > 80) errors.push("First name must be 80 characters or fewer");

  if (!lastName) errors.push("Last name is required");
  else if (lastName.length > 80) errors.push("Last name must be 80 characters or fewer");

  const email = emailValue || null;
  const phone = phoneValue || null;
  if (!email && !phone) {
    errors.push("Each row requires an email or phone number");
  }
  if (email && !emailSchema.safeParse(email).success) {
    errors.push("Email address is invalid");
  }
  if (phone && !validPhone(phone)) {
    errors.push("Phone number is invalid");
  }

  const zipCode = zipValue || null;
  if (zipCode && !/^\d{5}$/.test(zipCode)) {
    errors.push("ZIP code must contain exactly five digits");
  }

  const engagementStage = engagementStages.has(stageValue as CsvImportRowData["engagementStage"])
    ? (stageValue as CsvImportRowData["engagementStage"])
    : "new";
  if (!engagementStages.has(stageValue as CsvImportRowData["engagementStage"])) {
    errors.push("Engagement stage is invalid");
  }

  return {
    errors,
    data: {
      firstName,
      lastName,
      email,
      normalizedEmail: email && emailSchema.safeParse(email).success ? normalizeEmail(email) : null,
      phone,
      normalizedPhone: phone && validPhone(phone) ? normalizePhone(phone) : null,
      zipCode,
      municipality: readMappedCell(row, mapping, "municipality") || null,
      engagementStage,
      relationship: readMappedCell(row, mapping, "relationship") || null,
      interests: splitMultiValue(readMappedCell(row, mapping, "interests")),
      tags: splitMultiValue(readMappedCell(row, mapping, "tags")),
      source: readMappedCell(row, mapping, "source") || null,
    },
  };
}

export function previewCsvImport(
  fileText: string,
  mapping: CsvColumnMapping,
  existingPeople: readonly ImportMatchPerson[],
): CsvImportPreview {
  const parsed = parseCsv(fileText);
  assertValidMapping(parsed.headers, mapping);

  const rows = parsed.rows.map((row, index): CsvImportPreviewRow => {
    const { data, errors } = buildRowData(row, mapping);

    if (errors.length > 0) {
      return {
        rowNumber: index + 2,
        classification: "invalid",
        decision: "skip",
        existingPersonId: null,
        candidatePersonIds: [],
        errors,
        data,
      };
    }

    const exactEmailMatch = data.normalizedEmail
      ? existingPeople.find((person) => person.normalizedEmail === data.normalizedEmail)
      : undefined;
    if (exactEmailMatch) {
      return {
        rowNumber: index + 2,
        classification: "exact_email_match",
        decision: "update_existing",
        existingPersonId: exactEmailMatch.id,
        candidatePersonIds: [exactEmailMatch.id],
        errors: [],
        data,
      };
    }

    const phoneCandidates = data.normalizedPhone
      ? existingPeople.filter((person) => (
          person.normalizedPhone === data.normalizedPhone
          && comparableName(person.lastName) === comparableName(data.lastName)
        ))
      : [];
    if (phoneCandidates.length > 0) {
      return {
        rowNumber: index + 2,
        classification: "ambiguous_phone_match",
        decision: "skip",
        existingPersonId: null,
        candidatePersonIds: phoneCandidates.map((person) => person.id),
        errors: [],
        data,
      };
    }

    return {
      rowNumber: index + 2,
      classification: "new",
      decision: "create_new",
      existingPersonId: null,
      candidatePersonIds: [],
      errors: [],
      data,
    };
  });

  return {
    headers: parsed.headers,
    mapping,
    rows,
  };
}

function toApplyRow(
  row: CsvImportPreviewRow,
  decision: CsvImportDecision,
  existingPersonId: string | null,
): CsvImportApplyRow {
  return {
    row_number: row.rowNumber,
    decision,
    existing_person_id: decision === "update_existing" ? existingPersonId : null,
    first_name: row.data.firstName,
    last_name: row.data.lastName,
    email: row.data.email,
    normalized_email: row.data.normalizedEmail,
    phone: row.data.phone,
    normalized_phone: row.data.normalizedPhone,
    zip_code: row.data.zipCode,
    county_name: null,
    municipality: row.data.municipality,
    engagement_stage: row.data.engagementStage,
    relationship: row.data.relationship,
    interests: [...row.data.interests],
    tags: [...row.data.tags],
    source: row.data.source,
  };
}

export function buildCsvImportApplyRows(
  preview: CsvImportPreview,
  selections: readonly CsvImportDecisionSelection[],
): CsvImportApplyRow[] {
  const previewRows = new Map(preview.rows.map((row) => [row.rowNumber, row]));
  const selectionsByRow = new Map<number, CsvImportDecisionSelection>();

  for (const selection of selections) {
    if (!Number.isInteger(selection.rowNumber) || selection.rowNumber < 2) {
      throw new Error("CSV decision row number is invalid");
    }
    if (selectionsByRow.has(selection.rowNumber)) {
      throw new Error(`CSV row ${selection.rowNumber} has more than one decision`);
    }
    if (!previewRows.has(selection.rowNumber)) {
      throw new Error(`CSV row ${selection.rowNumber} is no longer present in the fresh preview`);
    }
    selectionsByRow.set(selection.rowNumber, selection);
  }

  return preview.rows.map((row) => {
    const selection = selectionsByRow.get(row.rowNumber) ?? {
      rowNumber: row.rowNumber,
      decision: row.decision,
      existingPersonId: row.existingPersonId,
    };

    if (selection.decision === "skip") {
      return toApplyRow(row, "skip", null);
    }

    if (row.classification === "invalid") {
      throw new Error(`Invalid CSV row ${row.rowNumber} cannot be applied`);
    }

    if (row.classification === "exact_email_match") {
      if (selection.decision === "create_new") {
        throw new Error(`Exact-email CSV row ${row.rowNumber} cannot create a new supporter`);
      }
      if (!row.existingPersonId || selection.existingPersonId !== row.existingPersonId) {
        throw new Error(`Exact-email CSV row ${row.rowNumber} update target does not match the fresh preview`);
      }
      return toApplyRow(row, "update_existing", row.existingPersonId);
    }

    if (row.classification === "ambiguous_phone_match") {
      if (selection.decision === "create_new") {
        if (selection.existingPersonId !== null) {
          throw new Error(`CSV row ${row.rowNumber} create-new decision cannot include an existing supporter`);
        }
        return toApplyRow(row, "create_new", null);
      }
      if (!selection.existingPersonId || !row.candidatePersonIds.includes(selection.existingPersonId)) {
        throw new Error(`CSV row ${row.rowNumber} update target is not a fresh preview candidate`);
      }
      return toApplyRow(row, "update_existing", selection.existingPersonId);
    }

    if (row.classification === "new") {
      if (selection.decision === "update_existing") {
        throw new Error(`New CSV row ${row.rowNumber} cannot update an existing supporter`);
      }
      if (selection.existingPersonId !== null) {
        throw new Error(`CSV row ${row.rowNumber} create-new decision cannot include an existing supporter`);
      }
      return toApplyRow(row, "create_new", null);
    }

    throw new Error(`CSV row ${row.rowNumber} has an unsupported classification`);
  });
}
