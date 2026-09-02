import { serializePeopleFilters, type PeopleFilterState } from "@/lib/crm/people-filters";
import type { SavedPeopleView } from "@/lib/crm/saved-views";
import {
  applySavedViewAction,
  createSavedViewAction,
  deleteSavedViewAction,
  renameSavedViewAction,
} from "./actions";

const statusMessages: Record<string, string> = {
  created: "Saved the current people view.",
  renamed: "Renamed the saved view.",
  deleted: "Deleted the saved view.",
  "duplicate-name": "You already have a saved view with that name.",
  "invalid-name": "Use a saved-view name between 1 and 80 characters.",
  "invalid-view": "That saved view is not available.",
};

const inputClass =
  "min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200";

export function SavedViews({
  filters,
  views,
  status,
}: {
  filters: PeopleFilterState;
  views: SavedPeopleView[];
  status: string | null;
}) {
  const currentQuery = serializePeopleFilters({ ...filters, page: 1 }).toString();
  const statusMessage = status ? statusMessages[status] : null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-semibold text-slate-950">Saved views</h2>
          <p className="mt-1 text-sm text-slate-500">
            Private filter sets are visible only to your staff account.
          </p>
        </div>

        <form action={createSavedViewAction} className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <input type="hidden" name="filters" value={currentQuery} />
          <input type="hidden" name="query" value={filters.query} />
          <input type="hidden" name="returnQuery" value={currentQuery} />
          <label className="sr-only" htmlFor="saved-view-name">Saved view name</label>
          <input
            className={`${inputClass} min-w-0 sm:w-64`}
            id="saved-view-name"
            name="name"
            maxLength={80}
            placeholder="Name this view"
            required
          />
          <button
            className="min-h-10 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            type="submit"
          >
            Save current view
          </button>
        </form>
      </div>

      {statusMessage ? (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700" role="status">
          {statusMessage}
        </p>
      ) : null}

      {views.length === 0 ? (
        <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
          No saved views yet. Apply useful filters, then save the current view.
        </p>
      ) : (
        <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 md:grid-cols-2 xl:grid-cols-3">
          {views.map((view) => (
            <div key={view.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{view.name}</div>
                  <div className="mt-1 text-xs text-slate-500">Private saved filter set</div>
                </div>
                <form action={applySavedViewAction}>
                  <input type="hidden" name="viewId" value={view.id} />
                  <button
                    className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    type="submit"
                  >
                    Apply
                  </button>
                </form>
              </div>

              <details className="mt-3 border-t border-slate-100 pt-2">
                <summary className="cursor-pointer text-xs font-medium text-slate-500">Manage</summary>
                <div className="mt-2 space-y-2">
                  <form action={renameSavedViewAction} className="flex gap-2">
                    <input type="hidden" name="viewId" value={view.id} />
                    <input type="hidden" name="returnQuery" value={currentQuery} />
                    <label className="sr-only" htmlFor={`rename-${view.id}`}>Rename saved view</label>
                    <input
                      className={`${inputClass} min-w-0 flex-1`}
                      id={`rename-${view.id}`}
                      name="name"
                      defaultValue={view.name}
                      maxLength={80}
                      required
                    />
                    <button className="rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50" type="submit">
                      Rename
                    </button>
                  </form>
                  <form action={deleteSavedViewAction}>
                    <input type="hidden" name="viewId" value={view.id} />
                    <input type="hidden" name="returnQuery" value={currentQuery} />
                    <button className="text-xs font-semibold text-red-700 hover:underline" type="submit">
                      Delete saved view
                    </button>
                  </form>
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
