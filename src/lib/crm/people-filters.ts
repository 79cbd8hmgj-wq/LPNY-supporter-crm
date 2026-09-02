import type { Database } from "@/lib/supabase/database.types";

type EngagementStage = Database["public"]["Enums"]["engagement_stage"];
export type MemberStatusFilter = "member" | "former_member" | "not_member";

export type PeopleFilterState = {
  query: string;
  countyId: string | null;
  zipCode: string | null;
  engagementStage: EngagementStage | null;
  relationshipSlug: string | null;
  interestSlug: string | null;
  tagId: string | null;
  organizerId: string | null;
  sourceSlug: string | null;
  joinedAfter: string | null;
  joinedBefore: string | null;
  inactiveDays: number | null;
  hasOpenTask: boolean | null;
  candidateInterest: boolean | null;
  memberStatus: MemberStatusFilter | null;
  page: number;
};

const ENGAGEMENT_STAGES = new Set<EngagementStage>([
  "new",
  "follow_up_needed",
  "contacted",
  "engaged",
  "inactive",
]);

const MEMBER_STATUSES = new Set<MemberStatusFilter>([
  "member",
  "former_member",
  "not_member",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ZIP_PATTERN = /^\d{5}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function trimmed(params: URLSearchParams, key: string) {
  return (params.get(key) ?? "").trim();
}

function parseUuid(value: string) {
  return UUID_PATTERN.test(value) ? value.toLowerCase() : null;
}

function parseSlug(value: string) {
  return value.length > 0 && value.length <= 100 && SLUG_PATTERN.test(value)
    ? value
    : null;
}

function parseDate(value: string) {
  if (!DATE_PATTERN.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10) === value ? value : null;
}

function parseBoolean(value: string) {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

function parsePositiveInteger(value: string, maximum: number) {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum
    ? parsed
    : null;
}

export function normalizePeopleSearchQuery(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 200);
}

export function parsePeopleFilters(params: URLSearchParams): PeopleFilterState {
  const countyId = parseUuid(trimmed(params, "county"));
  const tagId = parseUuid(trimmed(params, "tag"));
  const organizerId = parseUuid(trimmed(params, "organizer"));
  const zipCandidate = trimmed(params, "zip");
  const stageCandidate = trimmed(params, "stage") as EngagementStage;
  const memberStatusCandidate = trimmed(params, "memberStatus") as MemberStatusFilter;

  return {
    query: "",
    countyId,
    zipCode: ZIP_PATTERN.test(zipCandidate) ? zipCandidate : null,
    engagementStage: ENGAGEMENT_STAGES.has(stageCandidate) ? stageCandidate : null,
    relationshipSlug: parseSlug(trimmed(params, "relationship")),
    interestSlug: parseSlug(trimmed(params, "interest")),
    tagId,
    organizerId,
    sourceSlug: parseSlug(trimmed(params, "source")),
    joinedAfter: parseDate(trimmed(params, "joinedAfter")),
    joinedBefore: parseDate(trimmed(params, "joinedBefore")),
    inactiveDays: parsePositiveInteger(trimmed(params, "inactiveDays"), 3650),
    hasOpenTask: parseBoolean(trimmed(params, "openTask")),
    candidateInterest: parseBoolean(trimmed(params, "candidateInterest")),
    memberStatus: MEMBER_STATUSES.has(memberStatusCandidate) ? memberStatusCandidate : null,
    page: parsePositiveInteger(trimmed(params, "page"), 100000) ?? 1,
  };
}

export function serializePeopleFilters(filters: PeopleFilterState) {
  const params = new URLSearchParams();

  if (filters.query) params.set("search", "1");
  if (filters.countyId) params.set("county", filters.countyId);
  if (filters.zipCode) params.set("zip", filters.zipCode);
  if (filters.engagementStage) params.set("stage", filters.engagementStage);
  if (filters.relationshipSlug) params.set("relationship", filters.relationshipSlug);
  if (filters.interestSlug) params.set("interest", filters.interestSlug);
  if (filters.tagId) params.set("tag", filters.tagId);
  if (filters.organizerId) params.set("organizer", filters.organizerId);
  if (filters.sourceSlug) params.set("source", filters.sourceSlug);
  if (filters.joinedAfter) params.set("joinedAfter", filters.joinedAfter);
  if (filters.joinedBefore) params.set("joinedBefore", filters.joinedBefore);
  if (filters.inactiveDays !== null) params.set("inactiveDays", String(filters.inactiveDays));
  if (filters.hasOpenTask !== null) params.set("openTask", filters.hasOpenTask ? "yes" : "no");
  if (filters.candidateInterest !== null) {
    params.set("candidateInterest", filters.candidateInterest ? "yes" : "no");
  }
  if (filters.memberStatus) params.set("memberStatus", filters.memberStatus);
  if (filters.page > 1) params.set("page", String(filters.page));

  return params;
}
