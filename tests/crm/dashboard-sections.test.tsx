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
});
