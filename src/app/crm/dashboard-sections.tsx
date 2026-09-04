import Link from "next/link";
import type { DashboardActivity, DashboardData, DashboardPerson, DashboardTask } from "@/lib/crm/dashboard";

function formatDateTime(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStage(stage: DashboardPerson["engagementStage"]) {
  return stage.replaceAll("_", " ");
}

const ACTIVITY_LABELS: Record<string, string> = {
  contacted: "Contacted",
  unable_to_reach: "Unable to reach",
  task_completed: "Task completed",
  task_created: "Task created",
  follow_up_created: "Follow-up scheduled",
  stage_changed: "Stage changed",
  note_added: "Note added",
  reassigned: "Reassigned",
  do_not_contact_changed: "Do-not-contact updated",
  archived: "Archived",
  duplicate_merged: "Duplicate merged",
};

function formatActivityType(activityType: string) {
  return ACTIVITY_LABELS[activityType] ?? activityType.replaceAll("_", " ");
}

function QueueCard({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-lp-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-lp-100 px-4 py-3">
        <h2 className="font-semibold text-lp-900">{title}</h2>
        <span className="rounded-full bg-lp-100 px-2.5 py-1 text-xs font-semibold text-lp-700">
          {count}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
  emphasis = "default",
}: {
  label: string;
  value: string | number;
  detail?: string;
  emphasis?: "default" | "warning" | "danger";
}) {
  const classes =
    emphasis === "danger"
      ? "border-red-200 bg-red-50 text-red-950"
      : emphasis === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-lp-200 bg-white text-lp-950";
  const labelClass =
    emphasis === "danger"
      ? "text-red-700"
      : emphasis === "warning"
        ? "text-amber-800"
        : "text-lp-500";

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${classes}`}>
      <div className={`text-sm ${labelClass}`}>{label}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
      {detail ? <div className={`mt-1 text-xs ${labelClass}`}>{detail}</div> : null}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-sm text-lp-500">{children}</p>;
}

function ProfileLink({ personId, children }: { personId: string; children: React.ReactNode }) {
  return (
    <Link className="font-medium text-lp-900 hover:underline" href={`/crm/people/${personId}`}>
      {children}
    </Link>
  );
}

function PeopleList({ people }: { people: DashboardPerson[] }) {
  if (people.length === 0) {
    return <EmptyState>No contacts in this queue.</EmptyState>;
  }

  return (
    <ul className="divide-y divide-lp-100">
      {people.map((person) => (
        <li key={person.id} className="py-3 first:pt-0 last:pb-0">
          <div><ProfileLink personId={person.id}>{person.name}</ProfileLink></div>
          <div className="mt-0.5 text-sm text-lp-600">{person.contact}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-lp-500">
            <span className="capitalize">{formatStage(person.engagementStage)}</span>
            <span>Joined {formatDateTime(person.createdAt)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function TaskList({ tasks }: { tasks: DashboardTask[] }) {
  if (tasks.length === 0) {
    return <EmptyState>No tasks in this queue.</EmptyState>;
  }

  return (
    <ul className="divide-y divide-lp-100">
      {tasks.map((task) => (
        <li key={task.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div><ProfileLink personId={task.personId}>{task.personName}</ProfileLink></div>
              <div className="mt-0.5 text-sm capitalize text-lp-600">
                {task.taskType.replaceAll("_", " ")}
              </div>
            </div>
            <span className="rounded-md bg-lp-100 px-2 py-1 text-xs capitalize text-lp-600">
              {task.priority}
            </span>
          </div>
          <div className="mt-1 text-xs text-lp-500">Due {formatDateTime(task.dueAt)}</div>
        </li>
      ))}
    </ul>
  );
}

function ActivityList({ activities }: { activities: DashboardActivity[] }) {
  if (activities.length === 0) {
    return <EmptyState>No recent activity.</EmptyState>;
  }

  return (
    <ul className="divide-y divide-lp-100">
      {activities.slice(0, 5).map((activity) => (
        <li key={activity.id} className="py-2.5 first:pt-0 last:pb-0">
          <div className="text-sm leading-5">
            <ProfileLink personId={activity.personId}>{activity.personName}</ProfileLink>
            <span className="text-lp-600"> · {formatActivityType(activity.activityType)}</span>
          </div>
          <div className="mt-0.5 text-xs text-lp-500">{formatDateTime(activity.occurredAt)}</div>
        </li>
      ))}
    </ul>
  );
}

function CountBreakdown({ rows }: { rows: Array<{ label: string; count: number }> }) {
  if (rows.length === 0) {
    return <EmptyState>No data yet.</EmptyState>;
  }

  return (
    <ul className="space-y-2">
      {rows.slice(0, 8).map((row) => (
        <li key={row.label} className="flex items-center justify-between gap-4 text-sm">
          <span className="truncate text-lp-600">{row.label}</span>
          <span className="font-semibold tabular-nums text-lp-900">{row.count}</span>
        </li>
      ))}
    </ul>
  );
}

function SourcePerformance({ rows }: { rows: DashboardData["reporting"]["sourcePerformance"] }) {
  return (
    <section className="rounded-xl border border-lp-200 bg-white shadow-sm">
      <div className="border-b border-lp-100 px-4 py-3">
        <h2 className="font-semibold text-lp-900">Source performance</h2>
        <p className="mt-1 text-xs text-lp-500">
          Distinct supporters attributed during the selected period. Downstream percentages use signups as the denominator.
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 pb-4"><EmptyState>No source activity in this period.</EmptyState></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-lp-50 text-xs uppercase tracking-wide text-lp-500">
              <tr>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 text-right font-medium">Signups</th>
                <th className="px-4 py-3 text-right font-medium">Contacted</th>
                <th className="px-4 py-3 text-right font-medium">Engaged</th>
                <th className="px-4 py-3 text-right font-medium">Volunteers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lp-100">
              {rows.map((row) => (
                <tr key={row.sourceId}>
                  <th className="whitespace-nowrap px-4 py-3 font-medium text-lp-900">{row.sourceName}</th>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-lp-900">{row.signups}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-semibold tabular-nums text-lp-900">{row.contacted}</div>
                    <div className="text-xs tabular-nums text-lp-500">{row.contactedRate}%</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-semibold tabular-nums text-lp-900">{row.engaged}</div>
                    <div className="text-xs tabular-nums text-lp-500">{row.engagedRate}%</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-semibold tabular-nums text-lp-900">{row.volunteers}</div>
                    <div className="text-xs tabular-nums text-lp-500">{row.volunteerRate}%</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function DashboardSections({ data }: { data: DashboardData }) {
  const reporting = data.reporting;
  const recentActivity = data.recentActivity.slice(0, 5);

  return (
    <div className="space-y-6">
      <section aria-label="Reporting metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Active contacts" value={reporting.totalActiveContacts} />
        <MetricCard label="New contacts" value={reporting.newContactsInPeriod} />
        <MetricCard
          label="Follow-up completion"
          value={`${reporting.followUpCompletionRate}%`}
          detail={`${reporting.followUpCompletedTasks} of ${reporting.followUpEligibleTasks} completed`}
        />
        <MetricCard label="Overdue tasks" value={reporting.overdueTasks} emphasis="danger" />
        <MetricCard label="Unassigned contacts" value={reporting.unassignedContacts} emphasis="warning" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <QueueCard title="New supporters" count={data.newSupporters.length}>
          <PeopleList people={data.newSupporters} />
        </QueueCard>
        <QueueCard title="Follow-up due today" count={data.dueToday.length}>
          <TaskList tasks={data.dueToday} />
        </QueueCard>
        <QueueCard title="Overdue task queue" count={data.overdue.length}>
          <TaskList tasks={data.overdue} />
        </QueueCard>
        <QueueCard title="Recently contacted" count={data.recentlyContacted.length}>
          <PeopleList people={data.recentlyContacted} />
        </QueueCard>
        <QueueCard title="Unassigned contact queue" count={data.unassignedContacts.length}>
          <PeopleList people={data.unassignedContacts} />
        </QueueCard>
        <QueueCard title="Recent activity" count={recentActivity.length}>
          <ActivityList activities={recentActivity} />
        </QueueCard>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <QueueCard title="By engagement stage" count={reporting.byStage.length}>
          <CountBreakdown rows={reporting.byStage} />
        </QueueCard>
        <QueueCard title="By county" count={reporting.byCounty.length}>
          <CountBreakdown rows={reporting.byCounty} />
        </QueueCard>
        <QueueCard title="By source" count={reporting.bySource.length}>
          <CountBreakdown rows={reporting.bySource} />
        </QueueCard>
        <QueueCard title="By relationship" count={reporting.byRelationship.length}>
          <CountBreakdown rows={reporting.byRelationship} />
        </QueueCard>
        <QueueCard title="By interest" count={reporting.byInterest.length}>
          <CountBreakdown rows={reporting.byInterest} />
        </QueueCard>
      </section>

      <SourcePerformance rows={reporting.sourcePerformance} />
    </div>
  );
}
