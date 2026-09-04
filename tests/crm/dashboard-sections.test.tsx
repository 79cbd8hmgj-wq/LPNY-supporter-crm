import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardSections } from "@/app/crm/dashboard-sections";
import type { DashboardData } from "@/lib/crm/dashboard";

const data: DashboardData = {
  counts: {
    totalActiveContacts: 12,
    byStage: [{ label: "New", count: 4 }],
    byCounty: [{ label: "Albany", count: 7 }],
    bySource: [{ label: "Website", count: 6 }],
  },
  reporting: {
    period: "30d",
    periodStartIso: "2026-08-03T12:00:00.000Z",
    totalActiveContacts: 12,
    newContactsInPeriod: 5,
    overdueTasks: 3,
    unassignedContacts: 2,
    followUpEligibleTasks: 8,
    followUpCompletedTasks: 6,
    followUpCompletionRate: 75,
    byStage: [{ label: "New", count: 4 }],
    byCounty: [{ label: "Albany", count: 7 }],
    bySource: [{ label: "Website", count: 6 }],
    byRelationship: [
      { label: "Supporter", count: 10 },
      { label: "Volunteer", count: 4 },
    ],
    byInterest: [{ label: "Local activism", count: 5 }],
    sourcePerformance: [
      {
        sourceId: "website",
        sourceName: "Website",
        signups: 6,
        contacted: 4,
        engaged: 3,
        volunteers: 2,
        contactedRate: 67,
        engagedRate: 50,
        volunteerRate: 33,
      },
    ],
  },
  newSupporters: [],
  dueToday: [],
  overdue: [],
  recentlyContacted: [],
  unassignedContacts: [],
  recentActivity: [],
};

describe("DashboardSections", () => {
  it("renders complete Phase 5 metrics and source performance", () => {
    render(<DashboardSections data={data} />);

    expect(screen.getByText("Active contacts")).toBeInTheDocument();
    expect(screen.getByText("New contacts")).toBeInTheDocument();
    expect(screen.getByText("Follow-up completion")).toBeInTheDocument();
    expect(screen.getByText("Overdue tasks")).toBeInTheDocument();
    expect(screen.getByText("Unassigned contacts")).toBeInTheDocument();
    expect(screen.getByText("By engagement stage")).toBeInTheDocument();
    expect(screen.getByText("By county")).toBeInTheDocument();
    expect(screen.getByText("By source")).toBeInTheDocument();
    expect(screen.getByText("By relationship")).toBeInTheDocument();
    expect(screen.getByText("By interest")).toBeInTheDocument();
    expect(screen.getByText("Source performance")).toBeInTheDocument();

    expect(screen.getByText("Signups")).toBeInTheDocument();
    expect(screen.getByText("Contacted")).toBeInTheDocument();
    expect(screen.getByText("Engaged")).toBeInTheDocument();
    expect(screen.getByText("Volunteers")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("keeps recent activity compact and limits it to five visible updates", () => {
    render(
      <DashboardSections
        data={{
          ...data,
          recentActivity: [
            {
              id: "activity-1",
              personId: "person-1",
              personName: "First Supporter",
              activityType: "unable_to_reach",
              occurredAt: "2026-09-03T20:55:00.000Z",
            },
            {
              id: "activity-2",
              personId: "person-2",
              personName: "Second Supporter",
              activityType: "task_completed",
              occurredAt: "2026-09-03T20:54:00.000Z",
            },
            {
              id: "activity-3",
              personId: "person-3",
              personName: "Third Supporter",
              activityType: "note_added",
              occurredAt: "2026-09-03T20:53:00.000Z",
            },
            {
              id: "activity-4",
              personId: "person-4",
              personName: "Fourth Supporter",
              activityType: "stage_changed",
              occurredAt: "2026-09-03T20:52:00.000Z",
            },
            {
              id: "activity-5",
              personId: "person-5",
              personName: "Fifth Supporter",
              activityType: "reassigned",
              occurredAt: "2026-09-03T20:51:00.000Z",
            },
            {
              id: "activity-6",
              personId: "person-6",
              personName: "Sixth Supporter",
              activityType: "contacted",
              occurredAt: "2026-09-03T20:50:00.000Z",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("First Supporter")).toBeInTheDocument();
    expect(screen.getByText(/Unable to reach/)).toBeInTheDocument();
    expect(screen.getByText("Fifth Supporter")).toBeInTheDocument();
    expect(screen.queryByText("Sixth Supporter")).not.toBeInTheDocument();
  });
});
