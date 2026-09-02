import type { PeopleFilterState } from "@/lib/crm/people-filters";
import type { PeopleDirectoryOptions } from "@/lib/crm/people-directory-options";
import {
  applyPeopleFiltersAction,
  clearPeopleFiltersAction,
} from "./actions";

const inputClass =
  "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200";

function SelectField({
  label,
  name,
  value,
  options,
  emptyLabel = "Any",
}: {
  label: string;
  name: string;
  value: string | null;
  options: Array<{ value: string; label: string }>;
  emptyLabel?: string;
}) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <select className={inputClass} name={name} defaultValue={value ?? ""}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PeopleFilters({
  filters,
  options,
}: {
  filters: PeopleFilterState;
  options: PeopleDirectoryOptions;
}) {
  return (
    <form action={applyPeopleFiltersAction} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          <span>Name, email, phone, ZIP, municipality</span>
          <input
            className={inputClass}
            type="search"
            name="q"
            defaultValue={filters.query}
            placeholder="Search supporters"
          />
        </label>
        <SelectField label="County" name="county" value={filters.countyId} options={options.counties} />
        <SelectField
          label="Engagement stage"
          name="stage"
          value={filters.engagementStage}
          options={[
            { value: "new", label: "New" },
            { value: "follow_up_needed", label: "Follow-up Needed" },
            { value: "contacted", label: "Contacted" },
            { value: "engaged", label: "Engaged" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
        <div className="flex items-end gap-2">
          <button className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700" type="submit">
            Apply
          </button>
          <button
            className="min-h-11 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            type="submit"
            formAction={clearPeopleFiltersAction}
          >
            Clear
          </button>
        </div>
      </div>

      <details className="mt-4 border-t border-slate-100 pt-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">More filters</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>ZIP</span>
            <input className={inputClass} name="zip" inputMode="numeric" maxLength={5} defaultValue={filters.zipCode ?? ""} />
          </label>
          <SelectField label="Relationship" name="relationship" value={filters.relationshipSlug} options={options.relationships} />
          <SelectField label="Interest" name="interest" value={filters.interestSlug} options={options.interests} />
          <SelectField label="Tag" name="tag" value={filters.tagId} options={options.tags} />
          <SelectField label="Assigned organizer" name="organizer" value={filters.organizerId} options={options.organizers} />
          <SelectField label="Source" name="source" value={filters.sourceSlug} options={options.sources} />
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Joined on/after</span>
            <input className={inputClass} type="date" name="joinedAfter" defaultValue={filters.joinedAfter ?? ""} />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>Joined on/before</span>
            <input className={inputClass} type="date" name="joinedBefore" defaultValue={filters.joinedBefore ?? ""} />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            <span>No activity for days</span>
            <input className={inputClass} type="number" min={1} max={3650} name="inactiveDays" defaultValue={filters.inactiveDays ?? ""} />
          </label>
          <SelectField
            label="Has open task"
            name="openTask"
            value={filters.hasOpenTask === null ? null : filters.hasOpenTask ? "yes" : "no"}
            options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
          />
          <SelectField
            label="Candidate interest"
            name="candidateInterest"
            value={filters.candidateInterest === null ? null : filters.candidateInterest ? "yes" : "no"}
            options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
          />
          <SelectField
            label="Member status"
            name="memberStatus"
            value={filters.memberStatus}
            options={[
              { value: "member", label: "Member" },
              { value: "former_member", label: "Former Member" },
              { value: "not_member", label: "Not a Member" },
            ]}
          />
        </div>
      </details>
    </form>
  );
}
