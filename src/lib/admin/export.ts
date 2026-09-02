import type { Database } from "@/lib/supabase/database.types";
import { buildPeopleDirectoryRpcArgs } from "@/lib/crm/people-directory";
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

type DirectoryRpcRow = Database["public"]["Functions"]["search_people_directory"]["Returns"][number];

const EXPORT_PAGE_SIZE = 100;
const ASSOCIATION_CHUNK_SIZE = 500;

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

function chunks<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function appendAssociation(
  target: Map<string, Set<string>>,
  personId: string,
  name: string | undefined,
) {
  if (!name) return;
  const names = target.get(personId) ?? new Set<string>();
  names.add(name);
  target.set(personId, names);
}

function joinedAssociations(target: Map<string, Set<string>>, personId: string): string {
  return [...(target.get(personId) ?? [])]
    .sort((left, right) => left.localeCompare(right))
    .join("; ");
}

async function loadAllFilteredDirectoryRows(
  filters: PeopleFilterState,
  now: Date,
): Promise<DirectoryRpcRow[]> {
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const rows: DirectoryRpcRow[] = [];
  let offset = 0;
  let totalCount = Number.POSITIVE_INFINITY;

  while (offset < totalCount) {
    const args = {
      ...buildPeopleDirectoryRpcArgs({ ...filters, page: 1 }, now),
      p_limit: EXPORT_PAGE_SIZE,
      p_offset: offset,
    };
    const { data, error } = await supabase.rpc("search_people_directory", args);

    if (error || data === null) {
      throw new Error("Unable to build supporter export.");
    }

    if (data.length === 0) break;
    rows.push(...data);
    totalCount = data[0]?.total_count ?? rows.length;
    offset += data.length;
  }

  return rows;
}

export async function buildPeopleExportRows(
  filters: PeopleFilterState,
  now: Date = new Date(),
): Promise<PeopleExportRow[]> {
  const directoryRows = await loadAllFilteredDirectoryRows(filters, now);
  if (directoryRows.length === 0) return [];

  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const personIds = directoryRows.map((row) => row.id);
  const organizerIds = [...new Set(
    directoryRows
      .map((row) => row.assigned_staff_user_id)
      .filter((id): id is string => id !== null),
  )];

  const organizerNames = new Map<string, string>();
  if (organizerIds.length > 0) {
    const { data, error } = await supabase
      .from("staff_users")
      .select("id, display_name")
      .in("id", organizerIds);

    if (error) throw new Error("Unable to build supporter export.");
    for (const row of data ?? []) organizerNames.set(row.id, row.display_name);
  }

  const [relationshipTypesResult, interestsResult, tagsResult] = await Promise.all([
    supabase.from("relationship_types").select("id, name"),
    supabase.from("interests").select("id, name"),
    supabase.from("tags").select("id, name"),
  ]);

  if (relationshipTypesResult.error || interestsResult.error || tagsResult.error) {
    throw new Error("Unable to build supporter export.");
  }

  const relationshipNamesById = new Map(
    (relationshipTypesResult.data ?? []).map((row) => [row.id, row.name]),
  );
  const interestNamesById = new Map(
    (interestsResult.data ?? []).map((row) => [row.id, row.name]),
  );
  const tagNamesById = new Map(
    (tagsResult.data ?? []).map((row) => [row.id, row.name]),
  );
  const relationshipsByPerson = new Map<string, Set<string>>();
  const interestsByPerson = new Map<string, Set<string>>();
  const tagsByPerson = new Map<string, Set<string>>();

  for (const personIdChunk of chunks(personIds, ASSOCIATION_CHUNK_SIZE)) {
    const [relationshipsResult, personInterestsResult, personTagsResult] = await Promise.all([
      supabase
        .from("person_relationships")
        .select("person_id, relationship_type_id")
        .in("person_id", personIdChunk),
      supabase
        .from("person_interests")
        .select("person_id, interest_id")
        .in("person_id", personIdChunk),
      supabase
        .from("person_tags")
        .select("person_id, tag_id")
        .in("person_id", personIdChunk),
    ]);

    if (relationshipsResult.error || personInterestsResult.error || personTagsResult.error) {
      throw new Error("Unable to build supporter export.");
    }

    for (const row of relationshipsResult.data ?? []) {
      appendAssociation(
        relationshipsByPerson,
        row.person_id,
        relationshipNamesById.get(row.relationship_type_id),
      );
    }
    for (const row of personInterestsResult.data ?? []) {
      appendAssociation(interestsByPerson, row.person_id, interestNamesById.get(row.interest_id));
    }
    for (const row of personTagsResult.data ?? []) {
      appendAssociation(tagsByPerson, row.person_id, tagNamesById.get(row.tag_id));
    }
  }

  return directoryRows.map((row): PeopleExportRow => ({
    person_id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    zip_code: row.zip_code,
    county: row.county_name,
    municipality: row.municipality,
    engagement_stage: row.engagement_stage,
    assigned_organizer: row.assigned_staff_user_id
      ? organizerNames.get(row.assigned_staff_user_id) ?? null
      : null,
    relationships: joinedAssociations(relationshipsByPerson, row.id),
    interests: joinedAssociations(interestsByPerson, row.id),
    tags: joinedAssociations(tagsByPerson, row.id),
    do_not_contact: row.do_not_contact,
    created_at: row.created_at,
    last_activity_at: row.last_activity_at,
  }));
}
