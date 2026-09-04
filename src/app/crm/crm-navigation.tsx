import Link from "next/link";
import type { StaffRole } from "@/lib/auth/types";

export function CrmNavigation({ role }: { role: StaffRole }) {
  const canUseAdministration = role === "admin" || role === "state_organizer";

  return (
    <nav aria-label="CRM" className="order-last flex w-full flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <Link href="/crm" className="font-medium text-lp-200 hover:text-white">
        Dashboard
      </Link>
      <Link href="/crm/people" className="font-medium text-lp-200 hover:text-white">
        People
      </Link>
      <Link href="/crm/work" className="font-medium text-lp-200 hover:text-white">
        Events &amp; Tasks
      </Link>
      {role !== "volunteer_staff" ? (
        <Link href="/crm/quick-add" className="font-medium text-lp-200 hover:text-white">
          Quick Add
        </Link>
      ) : null}
      {canUseAdministration ? (
        <Link href="/crm/admin" className="font-medium text-lp-200 hover:text-white">
          Administration
        </Link>
      ) : null}
    </nav>
  );
}
