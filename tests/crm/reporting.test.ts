import { describe, expect, test } from "vitest";
import {
  aggregateReporting,
  aggregateSourcePerformance,
  parseReportingPeriod,
  reportingPeriodStart,
} from "@/lib/crm/reporting";

describe("reporting periods", () => {
  test("accepts supported period values and defaults invalid input to 30 days", () => {
    expect(parseReportingPeriod("7d")).toBe("7d");
    expect(parseReportingPeriod("30d")).toBe("30d");
    expect(parseReportingPeriod("90d")).toBe("90d");
    expect(parseReportingPeriod("all")).toBe("all");
    expect(parseReportingPeriod("year")).toBe("30d");
    expect(parseReportingPeriod(["7d", "90d"])).toBe("30d");
    expect(parseReportingPeriod(undefined)).toBe("30d");
  });

  test("computes deterministic UTC period starts from the supplied instant", () => {
    const now = new Date("2026-09-02T12:00:00.000Z");

    expect(reportingPeriodStart("7d", now)?.toISOString()).toBe("2026-08-26T12:00:00.000Z");
    expect(reportingPeriodStart("30d", now)?.toISOString()).toBe("2026-08-03T12:00:00.000Z");
    expect(reportingPeriodStart("90d", now)?.toISOString()).toBe("2026-06-04T12:00:00.000Z");
    expect(reportingPeriodStart("all", now)).toBeNull();
  });
});

describe("aggregateReporting", () => {
  test("computes scoped operational metrics and relationship/interest counts", () => {
    const result = aggregateReporting({
      periodStart: new Date("2026-08-03T12:00:00.000Z"),
      now: new Date("2026-09-02T12:00:00.000Z"),
      people: [
        { id: "p1", engagementStage: "new", countyId: "albany", assignedStaffUserId: "staff-1", createdAt: "2026-09-01T12:00:00.000Z" },
        { id: "p2", engagementStage: "contacted", countyId: "albany", assignedStaffUserId: null, createdAt: "2026-08-20T12:00:00.000Z" },
        { id: "p3", engagementStage: "engaged", countyId: "rensselaer", assignedStaffUserId: "staff-2", createdAt: "2026-08-15T12:00:00.000Z" },
        { id: "p4", engagementStage: "inactive", countyId: null, assignedStaffUserId: "staff-3", createdAt: "2026-07-01T12:00:00.000Z" },
        { id: "p5", engagementStage: "follow_up_needed", countyId: "albany", assignedStaffUserId: "staff-1", createdAt: "2026-09-02T10:00:00.000Z" },
      ],
      counties: [
        { id: "albany", name: "Albany" },
        { id: "rensselaer", name: "Rensselaer" },
      ],
      personSources: [
        { personId: "p1", sourceId: "website", occurredAt: "2026-09-01T12:00:00.000Z" },
        { personId: "p1", sourceId: "website", occurredAt: "2026-09-01T13:00:00.000Z" },
        { personId: "p2", sourceId: "website", occurredAt: "2026-08-20T12:00:00.000Z" },
        { personId: "p3", sourceId: "event", occurredAt: "2026-08-15T12:00:00.000Z" },
      ],
      sources: [
        { id: "website", name: "Get Involved Form" },
        { id: "event", name: "2026 State Convention" },
      ],
      personRelationships: [
        { personId: "p1", relationshipTypeId: "supporter" },
        { personId: "p2", relationshipTypeId: "supporter" },
        { personId: "p3", relationshipTypeId: "supporter" },
        { personId: "p4", relationshipTypeId: "supporter" },
        { personId: "p2", relationshipTypeId: "volunteer" },
        { personId: "p3", relationshipTypeId: "volunteer" },
      ],
      relationshipTypes: [
        { id: "supporter", name: "Supporter" },
        { id: "volunteer", name: "Volunteer" },
      ],
      personInterests: [
        { personId: "p1", interestId: "local" },
        { personId: "p2", interestId: "local" },
        { personId: "p3", interestId: "local" },
        { personId: "p1", interestId: "volunteering" },
        { personId: "p2", interestId: "volunteering" },
      ],
      interests: [
        { id: "local", name: "Local activism" },
        { id: "volunteering", name: "Volunteering" },
      ],
      tasks: [
        { id: "t1", status: "completed", createdAt: "2026-08-10T12:00:00.000Z", dueAt: "2026-08-12T12:00:00.000Z" },
        { id: "t2", status: "completed", createdAt: "2026-08-15T12:00:00.000Z", dueAt: "2026-08-16T12:00:00.000Z" },
        { id: "t3", status: "completed", createdAt: "2026-08-20T12:00:00.000Z", dueAt: "2026-08-21T12:00:00.000Z" },
        { id: "t4", status: "open", createdAt: "2026-08-25T12:00:00.000Z", dueAt: "2026-08-30T12:00:00.000Z" },
        { id: "t5", status: "open", createdAt: "2026-07-01T12:00:00.000Z", dueAt: "2026-08-31T12:00:00.000Z" },
        { id: "t6", status: "cancelled", createdAt: "2026-08-22T12:00:00.000Z", dueAt: "2026-08-23T12:00:00.000Z" },
      ],
    });

    expect(result.totalActiveContacts).toBe(5);
    expect(result.newContactsInPeriod).toBe(4);
    expect(result.overdueTasks).toBe(2);
    expect(result.unassignedContacts).toBe(1);
    expect(result.followUpEligibleTasks).toBe(4);
    expect(result.followUpCompletedTasks).toBe(3);
    expect(result.followUpCompletionRate).toBe(75);
    expect(result.byStage).toEqual([
      { label: "Contacted", count: 1 },
      { label: "Engaged", count: 1 },
      { label: "Follow-up Needed", count: 1 },
      { label: "Inactive", count: 1 },
      { label: "New", count: 1 },
    ]);
    expect(result.byCounty).toEqual([
      { label: "Albany", count: 3 },
      { label: "Rensselaer", count: 1 },
      { label: "Unresolved", count: 1 },
    ]);
    expect(result.bySource).toEqual([
      { label: "Get Involved Form", count: 2 },
      { label: "2026 State Convention", count: 1 },
    ]);
    expect(result.byRelationship).toEqual([
      { label: "Supporter", count: 4 },
      { label: "Volunteer", count: 2 },
    ]);
    expect(result.byInterest).toEqual([
      { label: "Local activism", count: 3 },
      { label: "Volunteering", count: 2 },
    ]);
  });

  test("all-time reporting includes all non-cancelled visible tasks", () => {
    const result = aggregateReporting({
      periodStart: null,
      now: new Date("2026-09-02T12:00:00.000Z"),
      people: [],
      counties: [],
      personSources: [],
      sources: [],
      personRelationships: [],
      relationshipTypes: [],
      personInterests: [],
      interests: [],
      tasks: [
        { id: "t1", status: "completed", createdAt: "2025-01-01T00:00:00.000Z", dueAt: null },
        { id: "t2", status: "open", createdAt: "2025-01-01T00:00:00.000Z", dueAt: null },
        { id: "t3", status: "cancelled", createdAt: "2025-01-01T00:00:00.000Z", dueAt: null },
      ],
    });

    expect(result.followUpEligibleTasks).toBe(2);
    expect(result.followUpCompletedTasks).toBe(1);
    expect(result.followUpCompletionRate).toBe(50);
  });
});

describe("aggregateSourcePerformance", () => {
  test("builds a distinct cumulative source funnel for scoped active people", () => {
    const rows = aggregateSourcePerformance({
      periodStart: new Date("2026-08-03T12:00:00.000Z"),
      people: [
        { id: "p1", engagementStage: "new" },
        { id: "p2", engagementStage: "contacted" },
        { id: "p3", engagementStage: "engaged" },
        { id: "p4", engagementStage: "engaged" },
      ],
      personSources: [
        { personId: "p1", sourceId: "website", occurredAt: "2026-09-01T12:00:00.000Z" },
        { personId: "p1", sourceId: "website", occurredAt: "2026-09-01T13:00:00.000Z" },
        { personId: "p2", sourceId: "website", occurredAt: "2026-08-20T12:00:00.000Z" },
        { personId: "p3", sourceId: "website", occurredAt: "2026-08-15T12:00:00.000Z" },
        { personId: "p4", sourceId: "event", occurredAt: "2026-08-10T12:00:00.000Z" },
        { personId: "p4", sourceId: "old", occurredAt: "2026-07-01T12:00:00.000Z" },
      ],
      sources: [
        { id: "website", name: "Website" },
        { id: "event", name: "Event" },
        { id: "old", name: "Old source" },
      ],
      volunteerPersonIds: new Set(["p2", "p3", "p4"]),
    });

    expect(rows).toEqual([
      {
        sourceId: "website",
        sourceName: "Website",
        signups: 3,
        contacted: 2,
        engaged: 1,
        volunteers: 2,
        contactedRate: 67,
        engagedRate: 33,
        volunteerRate: 67,
      },
      {
        sourceId: "event",
        sourceName: "Event",
        signups: 1,
        contacted: 1,
        engaged: 1,
        volunteers: 1,
        contactedRate: 100,
        engagedRate: 100,
        volunteerRate: 100,
      },
    ]);
  });
});
