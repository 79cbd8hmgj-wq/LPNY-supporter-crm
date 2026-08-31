import type { PeopleFilterState } from "@/lib/crm/people-filters";

export const EXPORT_HEADERS = [
  "person_id",
  "first_name",
  "last_name",
  "email",
  "phone",
  "zip_code",
  "county",
  "municipality",
  "engagement_stage",
  "assigned_organizer",
  "relationships",
  "interests",
  "tags",
  "do_not_contact",
  "created_at",
  "last_activity_at",
] as const;

export type PeopleExportHeader = (typeof EXPORT_HEADERS)[number];

export type PeopleExportRow = {
  person_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  zip_code: string | null;
  county: string | null;
  municipality: string | null;
  engagement_stage: string;
  assigned_organizer: string | null;
  relationships: string;
  interests: string;
  tags: string;
  do_not_contact: boolean;
  created_at: string;
  last_activity_at: string | null;
};

function spreadsheetSafe(value: string): string {
  const firstNonWhitespace = value.trimStart().charAt(0);
  return /^[=+\-@]$/.test(firstNonWhitespace) ? `'${value}` : value;
}

function csvCell(value: string | boolean | null): string {
  const raw = value === null ? "" : String(value);
  const safe = spreadsheetSafe(raw);
  if (!/[",\r\n]/.test(safe)) return safe;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function serializePeopleExportCsv(rows: readonly PeopleExportRow[]): string {
  const lines = [EXPORT_HEADERS.join(",")];
  for (const row of rows) {
    lines.push(EXPORT_HEADERS.map((header) => csvCell(row[header])).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

export function activeExportFilterKeys(filters: PeopleFilterState): string[] {
  const keys: string[] = [];
  if (filters.query) keys.push("query");
  if (filters.countyId) keys.push("county");
  if (filters.zipCode) keys.push("zip");
  if (filters.engagementStage) keys.push("stage");
  if (filters.relationshipSlug) keys.push("relationship");
  if (filters.interestSlug) keys.push("interest");
  if (filters.tagId) keys.push("tag");
  if (filters.organizerId) keys.push("organizer");
  if (filters.sourceSlug) keys.push("source");
  if (filters.joinedAfter) keys.push("joinedAfter");
  if (filters.joinedBefore) keys.push("joinedBefore");
  if (filters.inactiveDays !== null) keys.push("inactiveDays");
  if (filters.hasOpenTask !== null) keys.push("openTask");
  if (filters.candidateInterest !== null) keys.push("candidateInterest");
  if (filters.memberStatus) keys.push("memberStatus");
  return keys;
}
