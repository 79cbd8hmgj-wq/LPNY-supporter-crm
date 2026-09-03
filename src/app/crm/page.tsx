import Link from "next/link";
import { requireStaffUser } from "@/lib/auth/require-staff";
import { loadDashboardData } from "@/lib/crm/dashboard";
import { parseReportingPeriod, type ReportingPeriod } from "@/lib/crm/reporting";
import { DashboardSections } from "./dashboard-sections";

const REPORTING_PERIODS: Array<{ value: ReportingPeriod; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
];

export default async function CrmHomePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const params = await searchParams;
  await requireStaffUser();
  const period = parseReportingPeriod(params.period);
  const dashboard = await loadDashboardData(new Date(), period);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-lp-500">Organizer workspace</p>
          <h1 className="mt-1 text-2xl font-semibold text-lp-950 sm:text-3xl">CRM Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-lp-600 sm:text-base">
            Reporting and work queues automatically respect your CRM access scope. Start with what needs action today.
          </p>
        </div>
        <nav aria-label="Reporting period" className="flex flex-wrap gap-2">
          {REPORTING_PERIODS.map((option) => {
            const active = option.value === period;
            return (
              <Link
                key={option.value}
                href={`/crm?period=${option.value}`}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border-lp-900 bg-lp-900 text-white"
                    : "border-lp-200 bg-white text-lp-700 hover:border-lp-300 hover:bg-lp-50"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <DashboardSections data={dashboard} />
    </section>
  );
}
