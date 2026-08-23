import Link from "next/link";
import { loadPeopleDirectory } from "@/lib/crm/people-directory";
import { loadPeopleDirectoryOptions } from "@/lib/crm/people-directory-options";
import {
  parsePeopleFilters,
  serializePeopleFilters,
  type PeopleFilterState,
} from "@/lib/crm/people-filters";
import { loadSavedPeopleViews } from "@/lib/crm/saved-views";
import { PeopleFilters } from "./people-filters";
import { SavedViews } from "./saved-views";

type RawSearchParams = Record<string, string | string[] | undefined>;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "America/New_York",
});

const stageLabels: Record<NonNullable<PeopleFilterState["engagementStage"]>, string> = {
  new: "New",
  follow_up_needed: "Follow-up Needed",
  contacted: "Contacted",
  engaged: "Engaged",
  inactive: "Inactive",
};

function toUrlSearchParams(raw: RawSearchParams) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      params.set(key, value);
    } else if (Array.isArray(value) && value.length > 0) {
      params.set(key, value[0]);
    }
  }

  return params;
}

function pageHref(filters: PeopleFilterState, page: number) {
  const params = serializePeopleFilters({ ...filters, page });
  const query = params.toString();
  return query ? `/crm/people?${query}` : "/crm/people";
}

function formatDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Never";
}

export default async function PeopleDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const rawParams = await searchParams;
  const filters = parsePeopleFilters(toUrlSearchParams(rawParams));
  const savedViewStatus = typeof rawParams.savedViewStatus === "string"
    ? rawParams.savedViewStatus
    : null;
  const [directory, options, savedViews] = await Promise.all([
    loadPeopleDirectory(filters),
    loadPeopleDirectoryOptions(),
    loadSavedPeopleViews(),
  ]);

  const firstResult = directory.totalCount === 0
    ? 0
    : (directory.page - 1) * directory.pageSize + 1;
  const lastResult = Math.min(directory.page * directory.pageSize, directory.totalCount);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Organizer workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">People</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Search and combine supporter, relationship, interest, source, assignment, task, and activity filters.
          </p>
        </div>
        <div className="text-sm text-slate-500">
          {directory.totalCount.toLocaleString()} {directory.totalCount === 1 ? "person" : "people"}
        </div>
      </header>

      <PeopleFilters filters={filters} options={options} />
      <SavedViews filters={filters} views={savedViews} status={savedViewStatus} />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="font-semibold text-slate-950">Results</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {directory.totalCount === 0
                ? "No matching people"
                : `Showing ${firstResult.toLocaleString()}–${lastResult.toLocaleString()} of ${directory.totalCount.toLocaleString()}`}
            </p>
          </div>
        </div>

        {directory.people.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="font-medium text-slate-800">No people match these filters.</p>
            <p className="mt-1 text-sm text-slate-500">Remove one or more filters and try again.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {directory.people.map((person) => (
              <article key={person.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="min-w-0 truncate font-semibold text-slate-950">
                      <Link className="hover:underline" href={`/crm/people/${person.id}`}>
                        {person.first_name} {person.last_name}
                      </Link>
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {stageLabels[person.engagement_stage]}
                    </span>
                    {person.has_open_task ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Open task
                      </span>
                    ) : null}
                    {person.do_not_contact ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        Do not contact
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
                    {person.email ? <span className="break-all">{person.email}</span> : null}
                    {person.phone ? <span>{person.phone}</span> : null}
                    {!person.email && !person.phone ? <span>No contact information</span> : null}
                  </div>
                </div>

                <div className="text-sm text-slate-600">
                  <div>
                    {person.municipality ? `${person.municipality}, ` : ""}
                    {person.county_name ? `${person.county_name} County` : "County unknown"}
                    {person.zip_code ? ` · ${person.zip_code}` : ""}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Last activity: {formatDate(person.last_activity_at)}
                  </div>
                </div>

                <div className="text-left text-xs text-slate-500 sm:text-right">
                  Joined {formatDate(person.created_at)}
                </div>
              </article>
            ))}
          </div>
        )}

        {directory.totalPages > 1 ? (
          <nav className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3" aria-label="People directory pagination">
            {directory.page > 1 ? (
              <Link className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href={pageHref(filters, directory.page - 1)}>
                Previous
              </Link>
            ) : <span />}
            <span className="text-sm text-slate-500">
              Page {directory.page.toLocaleString()} of {directory.totalPages.toLocaleString()}
            </span>
            {directory.page < directory.totalPages ? (
              <Link className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href={pageHref(filters, directory.page + 1)}>
                Next
              </Link>
            ) : <span />}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
