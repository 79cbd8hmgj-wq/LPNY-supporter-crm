import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { getNewYorkDayRange } from "./dashboard-time";

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

  for (const person of input.people) {
    increment(stageCounts, STAGE_LABELS[person.engagementStage]);
    increment(countyCounts, person.countyId ? countyNames.get(person.countyId) ?? "Unresolved" : "Unresolved");
  }

  for (const association of input.personSources) {
    if (!visiblePersonIds.has(association.personId)) {
      continue;
    }

    const label = sourceNames.get(association.sourceId);
    if (label) {
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

export async function loadDashboardData(now: Date = new Date()): Promise<DashboardData> {
  const supabase = await createServerSupabaseClient();
  const dayRange = getNewYorkDayRange(now);

  const [
    peopleForCountsResult,
    countiesResult,
    personSourcesResult,
    sourcesResult,
    newSupportersResult,
    dueTodayResult,
    overdueResult,
    recentlyContactedResult,
    unassignedResult,
    recentActivityResult,
  ] = await Promise.all([
    supabase
      .from("people")
      .select("id, engagement_stage, county_id")
      .is("archived_at", null),
    supabase.from("counties").select("id, name").order("name"),
    supabase.from("person_sources").select("person_id, source_id"),
    supabase.from("sources").select("id, name").eq("active", true),
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
  const newSupporters = assertQuery(newSupportersResult.data, newSupportersResult.error, "new supporters");
  const dueToday = assertQuery(dueTodayResult.data, dueTodayResult.error, "tasks due today");
  const overdue = assertQuery(overdueResult.data, overdueResult.error, "overdue tasks");
  const recentlyContacted = assertQuery(recentlyContactedResult.data, recentlyContactedResult.error, "recently contacted supporters");
  const unassignedContacts = assertQuery(unassignedResult.data, unassignedResult.error, "unassigned contacts");
  const recentActivity = assertQuery(recentActivityResult.data, recentActivityResult.error, "recent activity");

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

  return {
    counts: aggregateDashboardCounts({
      people: peopleForCounts.map((person) => ({
        id: person.id,
        engagementStage: person.engagement_stage,
        countyId: person.county_id,
      })),
      counties: counties.map((county) => ({ id: county.id, name: county.name })),
      personSources: personSources.map((association) => ({
        personId: association.person_id,
        sourceId: association.source_id,
      })),
      sources: sources.map((source) => ({ id: source.id, name: source.name })),
    }),
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
