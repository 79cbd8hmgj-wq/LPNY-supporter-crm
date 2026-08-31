import type { PersonProfile } from "@/lib/crm/person-profile";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/New_York",
});

function formatDateTime(value: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : "Not recorded";
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function EmptyState({ children }: { children: string }) {
  return <p className="py-5 text-sm text-slate-500">{children}</p>;
}

function Chips({ values }: { values: string[] }) {
  if (values.length === 0) return <span className="text-sm text-slate-500">None recorded</span>;

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span key={value} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          {value}
        </span>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="font-semibold text-slate-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function ProfileOverview({ profile }: { profile: PersonProfile }) {
  const location = [
    profile.location.municipality,
    profile.location.countyName ? `${profile.location.countyName} County` : null,
    profile.location.zipCode,
  ].filter(Boolean).join(" · ");

  return (
    <Section title="Overview">
      <dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</dt>
          <dd className="mt-1 break-all text-slate-900">{profile.email ?? "Not recorded"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Phone</dt>
          <dd className="mt-1 text-slate-900">{profile.phone ?? "Not recorded"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Location</dt>
          <dd className="mt-1 text-slate-900">{location || "Not recorded"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Assigned organizer</dt>
          <dd className="mt-1 text-slate-900">
            {profile.assignedStaffUserId ? profile.assignedOrganizerName ?? "Assigned staff" : "Unassigned"}
          </dd>
        </div>
      </dl>

      <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-3">
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Relationships</h3>
          <Chips values={profile.relationships} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Interests</h3>
          <Chips values={profile.interests} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Tags</h3>
          <Chips values={profile.tags} />
        </div>
      </div>
    </Section>
  );
}

export function ProfileActivity({ profile }: { profile: PersonProfile }) {
  return (
    <Section title="Activity">
      {profile.activities.length === 0 ? <EmptyState>No activity recorded yet.</EmptyState> : (
        <ol className="divide-y divide-slate-100">
          {profile.activities.map((activity) => (
            <li key={activity.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-slate-900">{humanize(activity.activity_type)}</span>
                <time className="text-xs text-slate-500">{formatDateTime(activity.occurred_at)}</time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

export function ProfileTasks({ profile }: { profile: PersonProfile }) {
  return (
    <Section title="Tasks">
      {profile.tasks.length === 0 ? <EmptyState>No tasks recorded.</EmptyState> : (
        <div className="divide-y divide-slate-100">
          {profile.tasks.map((task) => (
            <div key={task.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-900">{humanize(task.task_type)}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{humanize(task.status)}</span>
                {task.priority === "high" ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">High priority</span>
                ) : null}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Due {formatDateTime(task.due_at)}
                {task.completed_at ? ` · Completed ${formatDateTime(task.completed_at)}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

export function ProfileSources({ profile }: { profile: PersonProfile }) {
  return (
    <Section title="Sources">
      {profile.sources.length === 0 ? <EmptyState>No source history recorded.</EmptyState> : (
        <div className="divide-y divide-slate-100">
          {profile.sources.map((source) => (
            <div key={source.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0">
              <div>
                <div className="text-sm font-medium text-slate-900">{source.name}</div>
                <div className="text-xs text-slate-500">{humanize(source.category)}</div>
              </div>
              <time className="text-xs text-slate-500">{formatDateTime(source.occurred_at)}</time>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

export function ProfileConsent({ profile }: { profile: PersonProfile }) {
  return (
    <Section title="Consent">
      {profile.consent.length === 0 ? <EmptyState>No explicit consent history recorded.</EmptyState> : (
        <div className="divide-y divide-slate-100">
          {profile.consent.map((event) => (
            <div key={event.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-slate-900">
                  {humanize(event.channel)} · {humanize(event.state)}
                </span>
                <time className="text-xs text-slate-500">{formatDateTime(event.effective_at)}</time>
              </div>
              {event.sourceName ? <div className="mt-1 text-xs text-slate-500">Source: {event.sourceName}</div> : null}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

export function ProfileNotes({ profile }: { profile: PersonProfile }) {
  return (
    <Section title="Internal notes">
      {profile.notes.length === 0 ? <EmptyState>No internal notes visible to you.</EmptyState> : (
        <div className="space-y-3">
          {profile.notes.map((note) => (
            <article key={note.id} className="rounded-lg bg-slate-50 p-3">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{note.body}</p>
              <div className="mt-2 text-xs text-slate-500">
                {note.authorName} · {formatDateTime(note.created_at)}{note.edited_at ? " · edited" : ""}
              </div>
            </article>
          ))}
        </div>
      )}
    </Section>
  );
}
