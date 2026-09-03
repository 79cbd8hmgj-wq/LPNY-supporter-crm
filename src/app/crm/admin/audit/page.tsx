import Link from "next/link";
import { requireStaffRole } from "@/lib/auth/require-role";
import {
  formatAuditAction,
  loadAdminAuditPage,
  parseAuditPage,
  summarizeAuditMetadata,
} from "@/lib/admin/audit";

type RawSearchParams = Record<string, string | string[] | undefined>;

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/New_York",
});

function pageHref(page: number): string {
  return page > 1 ? `/crm/admin/audit?page=${page}` : "/crm/admin/audit";
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  await requireStaffRole(["admin"]);
  const rawParams = await searchParams;
  const page = parseAuditPage(rawParams.page);
  const audit = await loadAdminAuditPage(page);

  const firstResult = audit.totalCount === 0
    ? 0
    : (audit.page - 1) * audit.pageSize + 1;
  const lastResult = Math.min(audit.page * audit.pageSize, audit.totalCount);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-lp-500">Administration</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-lp-950">Audit log</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-lp-600">
            Sensitive administrative actions are append-only. This view shows safe summaries rather than supporter contact data.
          </p>
        </div>
        <Link
          href="/crm/admin"
          className="w-fit rounded-lg border border-lp-300 px-3 py-2 text-sm font-medium text-lp-700 hover:bg-lp-50"
        >
          Back to administration
        </Link>
      </header>

      <section className="overflow-hidden rounded-xl border border-lp-200 bg-white shadow-sm">
        <div className="border-b border-lp-200 px-4 py-3">
          <h2 className="font-semibold text-lp-950">Administrative events</h2>
          <p className="mt-0.5 text-xs text-lp-500">
            {audit.totalCount === 0
              ? "No audit events recorded"
              : `Showing ${firstResult.toLocaleString()}–${lastResult.toLocaleString()} of ${audit.totalCount.toLocaleString()}`}
          </p>
        </div>

        {audit.events.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="font-medium text-lp-800">No audit events are available on this page.</p>
          </div>
        ) : (
          <div className="divide-y divide-lp-100">
            {audit.events.map((event) => {
              const metadata = summarizeAuditMetadata(event.metadata);
              return (
                <article key={event.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-start">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-lp-950">{formatAuditAction(event.action_type)}</h3>
                    <p className="mt-1 text-sm text-lp-600">By {event.actorDisplayName}</p>
                    {metadata.length > 0 ? (
                      <dl className="mt-3 flex flex-wrap gap-2">
                        {metadata.map((item) => (
                          <div key={`${item.label}-${item.value}`} className="rounded-lg bg-lp-50 px-2.5 py-1.5 text-xs text-lp-700">
                            <dt className="inline font-medium">{item.label}: </dt>
                            <dd className="inline break-all">{item.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>

                  <div className="text-sm text-lp-600">
                    <div>{formatAuditAction(event.target_type)}</div>
                    {event.target_id ? (
                      <div className="mt-1 break-all font-mono text-xs text-lp-500">{event.target_id}</div>
                    ) : (
                      <div className="mt-1 text-xs text-lp-500">No single record target</div>
                    )}
                  </div>

                  <time className="text-xs text-lp-500 lg:text-right" dateTime={event.occurred_at}>
                    {dateTimeFormatter.format(new Date(event.occurred_at))}
                  </time>
                </article>
              );
            })}
          </div>
        )}

        {audit.totalPages > 1 ? (
          <nav className="flex items-center justify-between gap-3 border-t border-lp-200 px-4 py-3" aria-label="Audit log pagination">
            {audit.page > 1 ? (
              <Link
                href={pageHref(audit.page - 1)}
                className="rounded-lg border border-lp-300 px-3 py-2 text-sm font-medium text-lp-700 hover:bg-lp-50"
              >
                Previous
              </Link>
            ) : <span />}
            <span className="text-sm text-lp-500">
              Page {audit.page.toLocaleString()} of {audit.totalPages.toLocaleString()}
            </span>
            {audit.page < audit.totalPages ? (
              <Link
                href={pageHref(audit.page + 1)}
                className="rounded-lg border border-lp-300 px-3 py-2 text-sm font-medium text-lp-700 hover:bg-lp-50"
              >
                Next
              </Link>
            ) : <span />}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
