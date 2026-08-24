import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffUser } from "@/lib/auth/require-staff";
import { loadPersonActionOptions } from "@/lib/crm/person-action-options";
import { loadPersonProfile } from "@/lib/crm/person-profile";
import { FollowUpActions } from "./follow-up-actions";
import {
  ProfileActivity,
  ProfileConsent,
  ProfileNotes,
  ProfileOverview,
  ProfileSources,
  ProfileTasks,
} from "./profile-sections";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/New_York",
});

const stageLabels = {
  new: "New",
  follow_up_needed: "Follow-up Needed",
  contacted: "Contacted",
  engaged: "Engaged",
  inactive: "Inactive",
} as const;

function formatDateTime(value: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : "Never";
}

function singleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PersonProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ personId: string }>;
  searchParams: Promise<{ actionStatus?: string | string[] }>;
}) {
  const [{ personId }, query, staff] = await Promise.all([
    params,
    searchParams,
    requireStaffUser(),
  ]);

  if (!UUID_PATTERN.test(personId)) {
    notFound();
  }

  const profile = await loadPersonProfile(personId);
  if (!profile) {
    notFound();
  }

  const actionOptions = await loadPersonActionOptions(personId, staff.role);
  const actionStatus = singleSearchParam(query.actionStatus);

  return (
    <div className="space-y-5">
      <div>
        <Link className="text-sm font-medium text-slate-600 hover:text-slate-950" href="/crm/people">
          ← Back to people
        </Link>
      </div>

      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Supporter profile</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{profile.name}</h1>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {stageLabels[profile.engagementStage]}
              </span>
              {profile.doNotContact ? (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                  Do not contact
                </span>
              ) : null}
            </div>
          </div>

          <dl className="grid shrink-0 gap-x-5 gap-y-2 text-sm sm:grid-cols-2 sm:text-right">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Last activity</dt>
              <dd className="mt-1 text-slate-800">{formatDateTime(profile.lastActivityAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Joined</dt>
              <dd className="mt-1 text-slate-800">{formatDateTime(profile.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </header>

      <ProfileOverview profile={profile} />
      <FollowUpActions
        profile={profile}
        options={actionOptions}
        role={staff.role}
        actionStatus={actionStatus}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <ProfileActivity profile={profile} />
        <ProfileTasks profile={profile} />
        <ProfileSources profile={profile} />
        <ProfileConsent profile={profile} />
      </div>

      <ProfileNotes profile={profile} />
    </div>
  );
}
