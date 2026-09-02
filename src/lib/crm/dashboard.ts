import type { Database } from "@/lib/supabase/database.types";
import { getNewYorkDayRange } from "./dashboard-time";
import {
  aggregateReporting,
  aggregateSourcePerformance,
  reportingPeriodStart,
  type ReportingPeriod,
  type SourcePerformanceRow,
} from "./reporting";

type EngagementStage = Database["public"]["Enums"]["engagement_stage"];
type TaskPriority = Database["public"]["Enums"]["task_priority"];

type CountRow = {
  label: string;
  count: number;
};

type AggregateInput = {
  people: Array<{
    id: string;
    engagementStage: EngagementStage;
    countyId: string | null;
  }>;
  counties: Array<{ id: string; name: string }>;
  personSources: Array<{ personId: string; sourceId: string }>;
  sources: Array<{ id: string; name: string }>;
};

export type DashboardPerson = {
  id: string;
  name: string;
  contact: string;
  engagementStage: EngagementStage;
  countyId: string | null;
  createdAt: string;
  lastActivityAt: string | null;
};

export type DashboardTask = {
  id: string;
  personId: string;
  personName: string;
  taskType: string;
  dueAt: string | null;
  priority: TaskPriority;
};

export type DashboardActivity = {
  id: string;
  personId: string;
  personName: string;
  activityType: string;
  occurredAt: string;
};

export type DashboardData = {
  counts: {
    totalActiveContacts: number;
    byStage: CountRow[];
    byCounty: CountRow[];
    bySource: CountRow[];
  };
  reporting: {
    period: ReportingPeriod;
    periodStartIso: string | null;
    totalActiveContacts: number;
    newContactsInPeriod: number;
    overdueTasks: number;
    unassignedContacts: number;
    followUpEligibleTasks: number;
    followUpCompletedTasks: number;
    followUpCompletionRate: number;
    byStage: CountRow[];
    byCounty: CountRow[];
    bySource: CountRow[];
    byRelationship: CountRow[];
    byInterest: CountRow[];
    sourcePerformance: SourcePerformanceRow[];
  };
  newSupporters: DashboardPerson[];
  dueToday: DashboardTask[];
  overdue: DashboardTask[];
  recentlyContacted: DashboardPerson[];
  unassignedContacts: DashboardPerson[];
  recentActivity: DashboardActivity[];
};

const STAGE_LABELS: Record<EngagementStage, string> = {
  new: "New",
  follow_up_needed: "Follow-up Needed",
  contacted: "Contacted",
  engaged: "Engaged",
  inactive: "Inactive",
};

const REPORTING_QUERY_PAGE_SIZE = 500;

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function toSortedCounts(map: Map<string, number>): CountRow[] {
  return [...map.entries()]
    .filter(([, count]) => count > 0)
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export function aggregateDashboardCounts(input: AggregateInput) {
  const countyNames = new Map(input.counties.map((county) => [county.id, county.name]));
  const sourceNames = new Map(input.sources.map((source) => [source.id, source.name]));
  const stageCounts = new Map<string, number>();
  const countyCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  const visiblePersonIds = new Set(input.people.map((person) => person.id));
  const countedSourceLinks = new Set<string>();

  for (const person of input.people) {
    increment(stageCounts, STAGE_LABELS[person.engagementStage]);
    increment(countyCounts, person.countyId ? countyNames.get(person.countyId) ?? "Unresolved" : "Unresolved");
  }

  for (const association of input.personSources) {
    if (!visiblePersonIds.has(association.personId)) {
      continue;
    }

    const label = sourceNames.get(association.sourceId);
    const pairKey = `${association.personId}:${association.sourceId}`;
    if (label && !countedSourceLinks.has(pairKey)) {
      countedSourceLinks.add(pairKey);
      increment(sourceCounts, label);
    }
  }

  return {
    totalActiveContacts: input.people.length,
    byStage: toSortedCounts(stageCounts),
    byCounty: toSortedCounts(countyCounts),
    bySource: toSortedCounts(sourceCounts),
  };
}

function personContact(person: { email: string | null; phone: string | null }) {
  return person.email ?? person.phone ?? "No contact method";
}

function personName(person: { first_name: string; last_name: string }) {
  return `${person.first_name} ${person.last_name}`.trim();
}

function mapPerson(person: {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  engagement_stage: EngagementStage;
  county_id: string | null;
  created_at: string;
  last_activity_at: string | null;
}): DashboardPerson {
  return {
    id: person.id,
    name: personName(person),
    contact: personContact(person),
    engagementStage: person.engagement_stage,
    countyId: person.county_id,
    createdAt: person.created_at,
    lastActivityAt: person.last_activity_at,
  };
}

function assertQuery<T>(data: T | null, error: { message: string } | null, label: string): T {
  if (error || data === null) {
    throw new Error(`Unable to load ${label}.`);
  }

  return data;
}

type PaginatedQueryResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export async function collectPaginatedRows<T>(
  fetchPage: (from: number, to: number) => Promise<PaginatedQueryResult<T>>,
  label: string,
  pageSize: number = REPORTING_QUERY_PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const pageRows = assertQuery(
      ...(await fetchPage(from, from + pageSize - 1)).let?.(() => []) as never,
    );
  }
}

export async function loadDashboardData(
  now: Date = new Date(),
  period: ReportingPeriod = "30d",
): Promise<DashboardData> {
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const dayRange = getNewYorkDayRange(now);
  const periodStart = reportingPeriodStart(period, now);

  const [
    peopleForCountsResult,
    countiesResult,
    personSourcesResult,
    sourcesResult,
    personRelationshipsResult,
    relationshipTypesResult,
    personInterestsResult,
    interestsResult,
    tasksForReportingResult,
    newSupportersResult,
    dueTodayResult,
    overdueResult,
    recentlyContactedResult,
    unassignedResult,
    recentActivityResult,
  ] = await Promise.all([
    supabase
      .from("people")
      .select("id, engagement_stage, county_id, assigned_staff_user_id, created_at")
      .is("archived_at", null),
    supabase.from("counties").select("id, name").order("name"),
    supabase.from("person_sources").select("person_id, source_id, occurred_at"),
    supabase.from("sources").select("id, name"),
    supabase.from("person_relationships").select("person_id, relationship_type_id"),
    supabase.from("relationship_types").select("id, slug, name"),
    supabase.from("person_interests").select("person_id, interest_id"),
    supabase.from("interests").select("id, name"),
    supabase.from("tasks").select("id, status, created_at, due_at"),
    supabase
      .from("people")
      .select("id, first_name, last_name, email, phone, engagement_stage, county_id, created_at, last_activity_at")
      .is("archived_at", null)
      .eq("engagement_stage", "new")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("tasks")
      .select("id, person_id, task_type, due_at, priority")
      .eq("status", "open")
      .gte("due_at", dayRange.startIso)
      .lt("due_at", dayRange.endIso)
      .order("due_at", { ascending: true })
      .limit(8),
    supabase
      .from("tasks")
      .select("id, person_id, task_type, due_at, priority")
      .eq("status", "open")
      .lt("due_at", dayRange.startIso)
      .order("due_at", { ascending: true })
      .limit(8),
    supabase
      .from("people")
      .select("id, first_name, last_name, email, phone, engagement_stage, county_id, created_at, last_activity_at")
      .is("archived_at", null)
      .eq("engagement_stage", "contacted")
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .limit(8),
    supabase
      .from("people")
      .select("id, first_name, last_name, email, phone, engagement_stage, county_id, created_at, last_activity_at")
      .is("archived_at", null)
      .is("assigned_staff_user_id", null)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("activities")
      .select("id, person_id, activity_type, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(10),
  ]);

  const peopleForCounts = assertQuery(peopleForCountsResult.data, peopleForCountsResult.error, "dashboard contact counts");
  const counties = assertQuery(countiesResult.data, countiesResult.error, "dashboard county counts");
  const personSources = assertQuery(personSourcesResult.data, personSourcesResult.error, "dashboard source associations");
  const sources = assertQuery(sourcesResult.data, sourcesResult.error, "dashboard sources");
  const personRelationships = assertQuery(
    personRelationshipsResult.data,
    personRelationshipsResult.error,
    "dashboard relationships",
  );
  const relationshipTypes = assertQuery(
    relationshipTypesResult.data,
    relationshipTypesResult.error,
    "dashboard relationship types",
  );
  const personInterests = assertQuery(personInterestsResult.data, personInterestsResult.error, "dashboard interests");
  const interests = assertQuery(interestsResult.data, interestsResult.error, "dashboard interest types");
  const tasksForReporting = assertQuery(
    tasksForReportingResult.data,
    tasksForReportingResult.error,
    "dashboard task reporting",
  );
  const newSupporters = assertQuery(newSupportersResult.data, newSupportersResult.error, "new supporters");
  const dueToday = assertQuery(dueTodayResult.data, dueTodayResult.error, "tasks due today");
  const overdue = assertQuery(overdueResult.data, overdueResult.error, "overdue tasks");
  const recentlyContacted = assertQuery(recentlyContactedResult.data, recentlyContactedResult.error, "recently contacted supporters");
  const unassignedContacts = assertQuery(unassignedResult.data, unassignedResult.error, "unassigned contacts");
  const recentActivity = assertQuery(recentActivityResult.data, recentActivityResult.error, "recent activity");

  const reportingPeople = peopleForCounts.map((person) => ({
    id: person.id,
    engagementStage: person.engagement_stage,
    countyId: person.county_id,
    assignedStaffUserId: person.assigned_staff_user_id,
    createdAt: person.created_at,
  }));
  const reportingSources = personSources.map((association) => ({
    personId: association.person_id,
    sourceId: association.source_id,
    occurredAt: association.occurred_at,
  }));
  const reportingRelationships = personRelationships.map((relationship) => ({
    personId: relationship.person_id,
    relationshipTypeId: relationship.relationship_type_id,
  }));
  const reportingInterests = personInterests.map((interest) => ({
    personId: interest.person_id,
    interestId: interest.interest_id,
  }));

  const reportingSummary = aggregateReporting({
    periodStart,
    now,
    people: reportingPeople,
    counties: counties.map((county) => ({ id: county.id, name: county.name })),
    personSources: reportingSources,
    sources: sources.map((source) => ({ id: source.id, name: source.name })),
    personRelationships: reportingRelationships,
    relationshipTypes: relationshipTypes.map((type) => ({ id: type.id, name: type.name })),
    personInterests: reportingInterests,
    interests: interests.map((interest) => ({ id: interest.id, name: interest.name })),
    tasks: tasksForReporting.map((task) => ({
      id: task.id,
      status: task.status,
      createdAt: task.created_at,
      dueAt: task.due_at,
    })),
  });

  const volunteerRelationshipTypeId = relationshipTypes.find((type) => type.slug === "volunteer")?.id;
  const volunteerPersonIds = new Set(
    volunteerRelationshipTypeId
      ? reportingRelationships
          .filter((relationship) => relationship.relationshipTypeId === volunteerRelationshipTypeId)
          .map((relationship) => relationship.personId)
      : [],
  );
  const sourcePerformance = aggregateSourcePerformance({
    periodStart,
    people: reportingPeople.map((person) => ({
      id: person.id,
      engagementStage: person.engagementStage,
    })),
    personSources: reportingSources,
    sources: sources.map((source) => ({ id: source.id, name: source.name })),
    volunteerPersonIds,
  });

  const referencedPersonIds = [...new Set([
    ...dueToday.map((task) => task.person_id),
    ...overdue.map((task) => task.person_id),
    ...recentActivity.map((activity) => activity.person_id),
  ])];

  let referencedPeople: Array<{ id: string; first_name: string; last_name: string }> = [];
  if (referencedPersonIds.length > 0) {
    const referencedPeopleResult = await supabase
      .from("people")
      .select("id, first_name, last_name")
      .in("id", referencedPersonIds);

    referencedPeople = assertQuery(referencedPeopleResult.data, referencedPeopleResult.error, "dashboard supporter names");
  }

  const namesByPersonId = new Map(referencedPeople.map((person) => [person.id, personName(person)]));
  const counts = aggregateDashboardCounts({
    people: reportingPeople.map((person) => ({
      id: person.id,
      engagementStage: person.engagementStage,
      countyId: person.countyId,
    })),
    counties: counties.map((county) => ({ id: county.id, name: county.name })),
    personSources: reportingSources.map((association) => ({
      personId: association.personId,
      sourceId: association.sourceId,
    })),
    sources: sources.map((source) => ({ id: source.id, name: source.name })),
  });

  return {
    counts,
    reporting: {
      period,
      periodStartIso: periodStart?.toISOString() ?? null,
      ...reportingSummary,
      sourcePerformance,
    },
    newSupporters: newSupporters.map(mapPerson),
    dueToday: dueToday.map((task) => ({
      id: task.id,
      personId: task.person_id,
      personName: namesByPersonId.get(task.person_id) ?? "Supporter",
      taskType: task.task_type,
      dueAt: task.due_at,
      priority: task.priority,
    })),
    overdue: overdue.map((task) => ({
      id: task.id,
      personId: task.person_id,
      personName: namesByPersonId.get(task.person_id) ?? "Supporter",
      taskType: task.task_type,
      dueAt: task.due_at,
      priority: task.priority,
    })),
    recentlyContacted: recentlyContacted.map(mapPerson),
    unassignedContacts: unassignedContacts.map(mapPerson),
    recentActivity: recentActivity.map((activity) => ({
      id: activity.id,
      personId: activity.person_id,
      personName: namesByPersonId.get(activity.person_id) ?? "Supporter",
      activityType: activity.activity_type,
      occurredAt: activity.occurred_at,
    })),
  };
}
