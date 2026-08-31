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

function formatActivityType(activityType: string) {
  return activityType.replaceAll("_", " ");
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
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {count}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-sm text-slate-500">{children}</p>;
}

function ProfileLink({ personId, children }: { personId: string; children: React.ReactNode }) {
  return (
    <Link className="font-medium text-slate-900 hover:underline" href={`/crm/people/${personId}`}>
      {children}
    </Link>
  );
}

function PeopleList({ people }: { people: DashboardPerson[] }) {
  if (people.length === 0) {
    return <EmptyState>No contacts in this queue.</EmptyState>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {people.map((person) => (
        <li key={person.id} className="py-3 first:pt-0 last:pb-0">
          <div><ProfileLink personId={person.id}>{person.name}</ProfileLink></div>
          <div className="mt-0.5 text-sm text-slate-600">{person.contact}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
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
    <ul className="divide-y divide-slate-100">
      {tasks.map((task) => (
        <li key={task.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div><ProfileLink personId={task.personId}>{task.personName}</ProfileLink></div>
              <div className="mt-0.5 text-sm capitalize text-slate-600">
                {task.taskType.replaceAll("_", " ")}
              </div>
            </div>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs capitalize text-slate-600">
              {task.priority}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Due {formatDateTime(task.dueAt)}</div>
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
    <ul className="divide-y divide-slate-100">
      {activities.map((activity) => (
        <li key={activity.id} className="py-3 first:pt-0 last:pb-0">
          <div><ProfileLink personId={activity.personId}>{activity.personName}</ProfileLink></div>
          <div className="mt-0.5 text-sm capitalize text-slate-600">
            {formatActivityType(activity.activityType)}
          </div>
          <div className="mt-1 text-xs text-slate-500">{formatDateTime(activity.occurredAt)}</div>
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
          <span className="truncate text-slate-600">{row.label}</span>
          <span className="font-semibold tabular-nums text-slate-900">{row.count}</span>
        </li>
      ))}
    </ul>
  );
}

export function DashboardSections({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">Active contacts in scope</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums text-slate-950">
            {data.counts.totalActiveContacts}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">New supporter preview</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums text-slate-950">
            {data.newSupporters.length}
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="text-sm text-amber-800">Due today preview</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums text-amber-950">
            {data.dueToday.length}
          </div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <div className="text-sm text-red-700">Overdue preview</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums text-red-950">
            {data.overdue.length}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <QueueCard title="New supporters" count={data.newSupporters.length}>
          <PeopleList people={data.newSupporters} />
        </QueueCard>
        <QueueCard title="Follow-up due today" count={data.dueToday.length}>
          <TaskList tasks={data.dueToday} />
        </QueueCard>
        <QueueCard title="Overdue tasks" count={data.overdue.length}>
          <TaskList tasks={data.overdue} />
        </QueueCard>
        <QueueCard title="Recently contacted" count={data.recentlyContacted.length}>
          <PeopleList people={data.recentlyContacted} />
        </QueueCard>
        <QueueCard title="Unassigned contacts" count={data.unassignedContacts.length}>
          <PeopleList people={data.unassignedContacts} />
        </QueueCard>
        <QueueCard title="Recent activity" count={data.recentActivity.length}>
          <ActivityList activities={data.recentActivity} />
        </QueueCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <QueueCard title="By engagement stage" count={data.counts.byStage.length}>
          <CountBreakdown rows={data.counts.byStage} />
        </QueueCard>
        <QueueCard title="By county" count={data.counts.byCounty.length}>
          <CountBreakdown rows={data.counts.byCounty} />
        </QueueCard>
        <QueueCard title="By source" count={data.counts.bySource.length}>
          <CountBreakdown rows={data.counts.bySource} />
        </QueueCard>
      </section>
    </div>
  );
}
