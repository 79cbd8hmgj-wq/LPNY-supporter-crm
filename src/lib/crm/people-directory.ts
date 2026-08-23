import type { Database } from "@/lib/supabase/database.types";
import { getNewYorkCalendarDayRange } from "./dashboard-time";
import type { PeopleFilterState } from "./people-filters";

const PAGE_SIZE = 25;

type DirectoryRpcArgs = Database["public"]["Functions"]["search_people_directory"]["Args"];
type DirectoryRpcRow = Database["public"]["Functions"]["search_people_directory"]["Returns"][number];

export type PeopleDirectoryRow = Omit<DirectoryRpcRow, "total_count">;

export type PeopleDirectoryResult = {
  people: PeopleDirectoryRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function buildPeopleDirectoryRpcArgs(
  filters: PeopleFilterState,
  now: Date = new Date(),
): DirectoryRpcArgs {
  const joinedAfter = filters.joinedAfter
    ? getNewYorkCalendarDayRange(filters.joinedAfter).startIso
    : null;
  const joinedBeforeExclusive = filters.joinedBefore
    ? getNewYorkCalendarDayRange(filters.joinedBefore).endIso
    : null;
  const lastActivityBefore = filters.inactiveDays
    ? new Date(now.getTime() - filters.inactiveDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  return {
    p_query: filters.query || null,
    p_county_id: filters.countyId,
    p_zip_code: filters.zipCode,
    p_engagement_stage: filters.engagementStage,
    p_relationship_slug: filters.relationshipSlug,
    p_interest_slug: filters.interestSlug,
    p_tag_id: filters.tagId,
    p_organizer_id: filters.organizerId,
    p_source_slug: filters.sourceSlug,
    p_joined_after: joinedAfter,
    p_joined_before_exclusive: joinedBeforeExclusive,
    p_last_activity_before: lastActivityBefore,
    p_has_open_task: filters.hasOpenTask,
    p_candidate_interest: filters.candidateInterest,
    p_member_status: filters.memberStatus,
    p_limit: PAGE_SIZE,
    p_offset: (filters.page - 1) * PAGE_SIZE,
  };
}

export async function loadPeopleDirectory(
  filters: PeopleFilterState,
  now: Date = new Date(),
): Promise<PeopleDirectoryResult> {
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "search_people_directory",
    buildPeopleDirectoryRpcArgs(filters, now),
  );

  if (error || data === null) {
    throw new Error("Unable to load the people directory.");
  }

  const totalCount = data[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    people: data.map(({ total_count: _totalCount, ...person }) => person),
    totalCount,
    page: filters.page,
    pageSize: PAGE_SIZE,
    totalPages,
  };
}
