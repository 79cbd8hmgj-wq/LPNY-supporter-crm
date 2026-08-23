import { DashboardSections } from "./dashboard-sections";
import { loadDashboardData } from "@/lib/crm/dashboard";

export default async function CrmHomePage() {
  const dashboard = await loadDashboardData();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Organizer workspace</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">CRM Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
          Your queues and counts automatically respect your CRM access scope. Start with what needs action today.
        </p>
      </div>
      <DashboardSections data={dashboard} />
    </section>
  );
}
