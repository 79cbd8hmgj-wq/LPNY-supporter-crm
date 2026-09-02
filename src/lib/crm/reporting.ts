import type { Database } from "@/lib/supabase/database.types";

type EngagementStage = Database["public"]["Enums"]["engagement_stage"];
type TaskStatus = Database["public"]["Enums"]["task_status"];

export type ReportingPeriod = "7d" | "30d" | "90d" | "all";

export type ReportingCountRow = {
  label: string;
  count: number;
};

export type SourcePerformanceRow = {
  sourceId: string;
  sourceName: string;
  signups: number;
  contacted: number;
  engaged: number;
  volunteers: number;
  contactedRate: number;
  engagedRate: number;
  volunteerRate: number;
};

type ReportingPerson = {
  id: string;
  engagementStage: EngagementStage;
  countyId: string | null;
  assignedStaffUserId: string | null;
  createdAt: string;
};

type ReportingSourceAssociation = {
  personId: string;
  sourceId: string;
  occurredAt: string;
};

type ReportingTaxonomyLink = {
  personId: string;
  relationshipTypeId?: string;
  interestId?: string;
};

type ReportingTask = {
  id: string;
  status: TaskStatus;
  createdAt: string;
  dueAt: string | null;
};

export type ReportingSummary = {
  totalActiveContacts: number;
  newContactsInPeriod: number;
  overdueTasks: number;
  unassignedContacts: number;
  followUpEligibleTasks: number;
  followUpCompletedTasks: number;
  followUpCompletionRate: number;
  byStage: ReportingCountRow[];
  byCounty: ReportingCountRow[];
  bySource: ReportingCountRow[];
  byRelationship: ReportingCountRow[];
  byInterest: ReportingCountRow[];
};

type AggregateReportingInput = {
  periodStart: Date | null;
  now: Date;
  people: ReportingPerson[];
  counties: Array<{ id: string; name: string }>;
  personSources: ReportingSourceAssociation[];
  sources: Array<{ id: string; name: string }>;
  personRelationships: Array<{ personId: string; relationshipTypeId: string }>;
  relationshipTypes: Array<{ id: string; name: string }>;
  personInterests: Array<{ personId: string; interestId: string }>;
  interests: Array<{ id: string; name: string }>;
  tasks: ReportingTask[];
};

type AggregateSourcePerformanceInput = {
  periodStart: Date | null;
  people: Array<{ id: string; engagementStage: EngagementStage }>;
  personSources: ReportingSourceAssociation[];
  sources: Array<{ id: string; name: string }>;
  volunteerPersonIds: Set<string>;
};

const STAGE_LABELS: Record<EngagementStage, string> = {
  new: "New",
  follow_up_needed: "Follow-up Needed",
  contacted: "Contacted",
  engaged: "Engaged",
  inactive: "Inactive",
};

const PERIOD_DAYS: Record<Exclude<ReportingPeriod, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function parseReportingPeriod(value: string | string[] | undefined): ReportingPeriod {
  if (typeof value !== "string") {
    return "30d";
  }

  return value === "7d" || value === "30d" || value === "90d" || value === "all"
    ? value
    : "30d";
}

export function reportingPeriodStart(period: ReportingPeriod, now: Date): Date | null {
  if (period === "all") {
    return null;
  }

  return new Date(now.getTime() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000);
}

function increment(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function toSortedCounts(map: Map<string, number>): ReportingCountRow[] {
  return [...map.entries()]
    .filter(([, count]) => count > 0)
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function isOnOrAfter(value: string, start: Date | null) {
  return start === null || new Date(value).getTime() >= start.getTime();
}

function percent(part: number, whole: number) {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

export function aggregateReporting(input: AggregateReportingInput): ReportingSummary {
  const visiblePersonIds = new Set(input.people.map((person) => person.id));
  const countyNames = new Map(input.counties.map((county) => [county.id, county.name]));
  const sourceNames = new Map(input.sources.map((source) => [source.id, source.name]));
  const relationshipNames = new Map(input.relationshipTypes.map((type) => [type.id, type.name]));
  const interestNames = new Map(input.interests.map((interest) => [interest.id, interest.name]));

  const stageCounts = new Map<string, number>();
  const countyCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  const relationshipCounts = new Map<string, number>();
  const interestCounts = new Map<string, number>();

  for (const person of input.people) {
    increment(stageCounts, STAGE_LABELS[person.engagementStage]);
    increment(
      countyCounts,
      person.countyId ? countyNames.get(person.countyId) ?? "Unresolved" : "Unresolved",
    );
  }

  const countedSourceLinks = new Set<string>();
  for (const association of input.personSources) {
    if (!visiblePersonIds.has(association.personId)) {
      continue;
    }

    const sourceName = sourceNames.get(association.sourceId);
    const pairKey = `${association.personId}:${association.sourceId}`;
    if (sourceName && !countedSourceLinks.has(pairKey)) {
      countedSourceLinks.add(pairKey);
      increment(sourceCounts, sourceName);
    }
  }

  const countedRelationshipLinks = new Set<string>();
  for (const link of input.personRelationships) {
    if (!visiblePersonIds.has(link.personId)) {
      continue;
    }

    const relationshipName = relationshipNames.get(link.relationshipTypeId);
    const pairKey = `${link.personId}:${link.relationshipTypeId}`;
    if (relationshipName && !countedRelationshipLinks.has(pairKey)) {
      countedRelationshipLinks.add(pairKey);
      increment(relationshipCounts, relationshipName);
    }
  }

  const countedInterestLinks = new Set<string>();
  for (const link of input.personInterests) {
    if (!visiblePersonIds.has(link.personId)) {
      continue;
    }

    const interestName = interestNames.get(link.interestId);
    const pairKey = `${link.personId}:${link.interestId}`;
    if (interestName && !countedInterestLinks.has(pairKey)) {
      countedInterestLinks.add(pairKey);
      increment(interestCounts, interestName);
    }
  }

  const eligibleTasks = input.tasks.filter(
    (task) => task.status !== "cancelled" && isOnOrAfter(task.createdAt, input.periodStart),
  );
  const completedTasks = eligibleTasks.filter((task) => task.status === "completed");
  const nowTime = input.now.getTime();
  const overdueTasks = input.tasks.filter(
    (task) =>
      task.status === "open" &&
      task.dueAt !== null &&
      new Date(task.dueAt).getTime() < nowTime,
  ).length;

  return {
    totalActiveContacts: input.people.length,
    newContactsInPeriod: input.people.filter((person) => isOnOrAfter(person.createdAt, input.periodStart)).length,
    overdueTasks,
    unassignedContacts: input.people.filter((person) => person.assignedStaffUserId === null).length,
    followUpEligibleTasks: eligibleTasks.length,
    followUpCompletedTasks: completedTasks.length,
    followUpCompletionRate: percent(completedTasks.length, eligibleTasks.length),
    byStage: toSortedCounts(stageCounts),
    byCounty: toSortedCounts(countyCounts),
    bySource: toSortedCounts(sourceCounts),
    byRelationship: toSortedCounts(relationshipCounts),
    byInterest: toSortedCounts(interestCounts),
  };
}

export function aggregateSourcePerformance(input: AggregateSourcePerformanceInput): SourcePerformanceRow[] {
  const peopleById = new Map(input.people.map((person) => [person.id, person]));
  const sourceNames = new Map(input.sources.map((source) => [source.id, source.name]));
  const peopleBySource = new Map<string, Set<string>>();

  for (const association of input.personSources) {
    if (!peopleById.has(association.personId) || !sourceNames.has(association.sourceId)) {
      continue;
    }
    if (!isOnOrAfter(association.occurredAt, input.periodStart)) {
      continue;
    }

    const sourcePeople = peopleBySource.get(association.sourceId) ?? new Set<string>();
    sourcePeople.add(association.personId);
    peopleBySource.set(association.sourceId, sourcePeople);
  }

  const rows: SourcePerformanceRow[] = [];

  for (const [sourceId, personIds] of peopleBySource) {
    const sourceName = sourceNames.get(sourceId);
    if (!sourceName || personIds.size === 0) {
      continue;
    }

    let contacted = 0;
    let engaged = 0;
    let volunteers = 0;

    for (const personId of personIds) {
      const person = peopleById.get(personId);
      if (!person) {
        continue;
      }

      if (person.engagementStage === "contacted" || person.engagementStage === "engaged") {
        contacted += 1;
      }
      if (person.engagementStage === "engaged") {
        engaged += 1;
      }
      if (input.volunteerPersonIds.has(personId)) {
        volunteers += 1;
      }
    }

    const signups = personIds.size;
    rows.push({
      sourceId,
      sourceName,
      signups,
      contacted,
      engaged,
      volunteers,
      contactedRate: percent(contacted, signups),
      engagedRate: percent(engaged, signups),
      volunteerRate: percent(volunteers, signups),
    });
  }

  return rows.sort(
    (left, right) => right.signups - left.signups || left.sourceName.localeCompare(right.sourceName),
  );
}
