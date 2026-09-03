import type { StaffRole } from "@/lib/auth/types";
import type { PersonActionOptions } from "@/lib/crm/person-action-options";
import type { PersonProfile } from "@/lib/crm/person-profile";
import {
  addNoteAction,
  archivePersonAction,
  changeStageAction,
  completeTaskAction,
  createFollowUpAction,
  reassignPersonAction,
  recordContactOutcomeAction,
  setDoNotContactAction,
  setInterestAction,
  setRelationshipAction,
  setTagAction,
} from "./actions";

const inputClass = "min-h-11 w-full rounded-lg border border-lp-300 bg-white px-3 py-2 text-sm text-lp-950 outline-none focus:border-lp-700 focus:ring-2 focus:ring-lp-200";
const primaryButton = "min-h-11 rounded-lg bg-lp-900 px-4 py-2 text-sm font-semibold text-white hover:bg-lp-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "min-h-10 rounded-lg border border-lp-300 bg-white px-3 py-2 text-sm font-medium text-lp-800 hover:bg-lp-50";

const statusMessages: Record<string, string> = {
  contacted: "Contact outcome recorded.",
  "unable-to-reach": "Unable-to-reach outcome recorded.",
  "follow-up-created": "Follow-up task created.",
  "stage-updated": "Engagement stage updated.",
  "note-added": "Internal note added.",
  "relationship-updated": "Relationship updated.",
  "interest-updated": "Interest updated.",
  "tag-updated": "Tag updated.",
  reassigned: "Organizer assignment updated.",
  "do-not-contact-updated": "Do-not-contact status updated.",
  "task-completed": "Task completed.",
  invalid: "That action contained invalid information and was not saved.",
};

const stageOptions = [
  ["new", "New"],
  ["follow_up_needed", "Follow-up Needed"],
  ["contacted", "Contacted"],
  ["engaged", "Engaged"],
  ["inactive", "Inactive"],
] as const;

function HiddenPerson({ personId }: { personId: string }) {
  return <input type="hidden" name="personId" value={personId} />;
}

function ActionStatus({ status }: { status?: string }) {
  if (!status || !statusMessages[status]) return null;
  const invalid = status === "invalid";
  return (
    <p className={`rounded-lg p-3 text-sm ${invalid ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`} role="status">
      {statusMessages[status]}
    </p>
  );
}

function ToggleRows({
  personId,
  options,
  field,
  action,
}: {
  personId: string;
  options: Array<{ id: string; name: string; enabled: boolean; slug?: string }>;
  field: "slug" | "tagId";
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="divide-y divide-lp-100 rounded-lg border border-lp-200">
      {options.map((option) => (
        <form key={option.id} action={action} className="flex items-center justify-between gap-3 p-2.5">
          <HiddenPerson personId={personId} />
          <input type="hidden" name={field} value={field === "slug" ? option.slug : option.id} />
          <input type="hidden" name="enabled" value={option.enabled ? "false" : "true"} />
          <span className="text-sm text-lp-800">{option.name}</span>
          <button className={secondaryButton} type="submit">{option.enabled ? "Remove" : "Add"}</button>
        </form>
      ))}
    </div>
  );
}

export function FollowUpActions({
  profile,
  options,
  role,
  actionStatus,
}: {
  profile: PersonProfile;
  options: PersonActionOptions;
  role: StaffRole;
  actionStatus?: string;
}) {
  const canEnrich = role !== "volunteer_staff";
  const canReassign = role === "admin" || role === "state_organizer";
  const canArchive = role === "admin";
  const openTasks = profile.tasks.filter((task) => task.status === "open");

  return (
    <section className="rounded-xl border border-lp-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-lp-950">Organizer actions</h2>
          <p className="mt-1 text-sm text-lp-500">Record the next step without leaving the supporter profile.</p>
        </div>
        {profile.doNotContact ? (
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Outreach restricted</span>
        ) : null}
      </div>

      <div className="mt-4"><ActionStatus status={actionStatus} /></div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-lp-200 p-3">
          <h3 className="text-sm font-semibold text-lp-900">Contact outcome</h3>
          <div className="flex flex-wrap gap-2">
            <form action={recordContactOutcomeAction}>
              <HiddenPerson personId={profile.id} />
              <input type="hidden" name="outcome" value="contacted" />
              <input type="hidden" name="followUpDueAt" value="" />
              <button className={primaryButton} type="submit">Mark contacted</button>
            </form>
            <form action={recordContactOutcomeAction} className="flex flex-1 flex-wrap gap-2">
              <HiddenPerson personId={profile.id} />
              <input type="hidden" name="outcome" value="unable_to_reach" />
              <input className={`${inputClass} min-w-52 flex-1`} type="datetime-local" name="followUpDueAt" aria-label="Optional follow-up date after unable to reach" />
              <button className={secondaryButton} type="submit">Unable to reach</button>
            </form>
          </div>
          <p className="text-xs text-lp-500">Dates are interpreted in New York time.</p>
        </div>

        <form action={createFollowUpAction} className="space-y-3 rounded-lg border border-lp-200 p-3">
          <h3 className="text-sm font-semibold text-lp-900">Create follow-up</h3>
          {profile.doNotContact ? <p className="text-xs font-medium text-red-700">Clear do-not-contact before scheduling outreach.</p> : null}
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <HiddenPerson personId={profile.id} />
            <input className={inputClass} type="datetime-local" name="dueAt" aria-label="Follow-up due date" required disabled={profile.doNotContact} />
            <select className={inputClass} name="priority" defaultValue="normal" aria-label="Follow-up priority" disabled={profile.doNotContact}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <button className={primaryButton} type="submit" disabled={profile.doNotContact}>Create follow-up</button>
        </form>

        <form action={addNoteAction} className="space-y-3 rounded-lg border border-lp-200 p-3 lg:col-span-2">
          <h3 className="text-sm font-semibold text-lp-900">Add internal note</h3>
          <HiddenPerson personId={profile.id} />
          <textarea className={`${inputClass} min-h-24 resize-y`} name="body" maxLength={4000} required placeholder="Record useful context for the next organizer…" />
          <button className={secondaryButton} type="submit">Add note</button>
        </form>
      </div>

      <details className="mt-4 rounded-lg border border-lp-200 p-3" open={openTasks.length > 0}>
        <summary className="cursor-pointer text-sm font-semibold text-lp-900">Open tasks ({openTasks.length})</summary>
        <div className="mt-3 space-y-2">
          {openTasks.length === 0 ? <p className="text-sm text-lp-500">No open tasks.</p> : openTasks.map((task) => (
            <form key={task.id} action={completeTaskAction} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-lp-50 p-3">
              <HiddenPerson personId={profile.id} />
              <input type="hidden" name="taskId" value={task.id} />
              <div>
                <div className="text-sm font-medium text-lp-900">{task.task_type.replaceAll("_", " ")}</div>
                <div className="text-xs text-lp-500">{task.priority} priority</div>
              </div>
              <button className={secondaryButton} type="submit">Complete</button>
            </form>
          ))}
        </div>
      </details>

      {canEnrich ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <form action={changeStageAction} className="space-y-3 rounded-lg border border-lp-200 p-3">
            <h3 className="text-sm font-semibold text-lp-900">Engagement stage</h3>
            <HiddenPerson personId={profile.id} />
            <select className={inputClass} name="stage" defaultValue={profile.engagementStage}>
              {stageOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button className={secondaryButton} type="submit">Update stage</button>
          </form>

          <form action={setDoNotContactAction} className={`space-y-3 rounded-lg border p-3 ${profile.doNotContact ? "border-red-200 bg-red-50/40" : "border-lp-200"}`}>
            <h3 className="text-sm font-semibold text-lp-900">Do not contact</h3>
            <HiddenPerson personId={profile.id} />
            <input type="hidden" name="enabled" value={profile.doNotContact ? "false" : "true"} />
            <p className="text-sm text-lp-600">{profile.doNotContact ? "Outreach is currently restricted for this person." : "Use this when the person asks not to receive outreach."}</p>
            <button className={profile.doNotContact ? secondaryButton : "min-h-10 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"} type="submit">
              {profile.doNotContact ? "Clear do-not-contact" : "Mark do-not-contact"}
            </button>
          </form>

          <details className="rounded-lg border border-lp-200 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-lp-900">Relationships</summary>
            <div className="mt-3"><ToggleRows personId={profile.id} options={options.relationships} field="slug" action={setRelationshipAction} /></div>
          </details>

          <details className="rounded-lg border border-lp-200 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-lp-900">Interests</summary>
            <div className="mt-3"><ToggleRows personId={profile.id} options={options.interests} field="slug" action={setInterestAction} /></div>
          </details>

          <details className="rounded-lg border border-lp-200 p-3 lg:col-span-2">
            <summary className="cursor-pointer text-sm font-semibold text-lp-900">Tags</summary>
            <div className="mt-3"><ToggleRows personId={profile.id} options={options.tags} field="tagId" action={setTagAction} /></div>
          </details>
        </div>
      ) : (
        <form action={setDoNotContactAction} className={`mt-4 space-y-3 rounded-lg border p-3 ${profile.doNotContact ? "border-red-200 bg-red-50/40" : "border-lp-200"}`}>
          <h3 className="text-sm font-semibold text-lp-900">Do not contact</h3>
          <HiddenPerson personId={profile.id} />
          <input type="hidden" name="enabled" value={profile.doNotContact ? "false" : "true"} />
          <p className="text-sm text-lp-600">{profile.doNotContact ? "Outreach is currently restricted for this person." : "Record a do-not-contact request from this assigned supporter."}</p>
          <button className={profile.doNotContact ? secondaryButton : "min-h-10 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"} type="submit">
            {profile.doNotContact ? "Clear do-not-contact" : "Mark do-not-contact"}
          </button>
        </form>
      )}

      {canReassign && options.organizers.length > 0 ? (
        <form action={reassignPersonAction} className="mt-4 space-y-3 rounded-lg border border-lp-200 p-3">
          <h3 className="text-sm font-semibold text-lp-900">Reassign organizer</h3>
          <HiddenPerson personId={profile.id} />
          <select className={inputClass} name="staffUserId" defaultValue={profile.assignedStaffUserId ?? ""} required>
            <option value="" disabled>Select an organizer</option>
            {options.organizers.map((organizer) => (
              <option key={organizer.id} value={organizer.id}>{organizer.name} · {organizer.role.replaceAll("_", " ")}</option>
            ))}
          </select>
          <p className="text-xs text-lp-500">County assignments are validated again by the database before reassignment is saved.</p>
          <button className={secondaryButton} type="submit">Reassign</button>
        </form>
      ) : null}

      {canArchive ? (
        <details className="mt-4 rounded-lg border border-red-200 bg-red-50/30 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-red-800">Archive supporter</summary>
          <form action={archivePersonAction} className="mt-3 space-y-3">
            <HiddenPerson personId={profile.id} />
            <p className="text-sm text-red-800">Archiving hides this person from normal CRM work while preserving their history. Type <strong>ARCHIVE</strong> to confirm.</p>
            <input className={inputClass} name="confirmation" autoComplete="off" required aria-label="Type ARCHIVE to confirm" />
            <button className="min-h-10 rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800" type="submit">Archive supporter</button>
          </form>
        </details>
      ) : null}
    </section>
  );
}
