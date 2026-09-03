import Link from "next/link";
import type { ReactNode } from "react";
import { requireStaffUser } from "@/lib/auth/require-staff";

export default async function CrmLayout({ children }: { children: ReactNode }) {
  const staff = await requireStaffUser();
  const canUseAdministration = staff.role === "admin" || staff.role === "state_organizer";

  return (
    <div className="min-h-screen bg-lp-50 text-lp-950">
      <header className="border-b-4 border-lp-gold bg-lp-navy text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <Link href="/crm" className="font-semibold tracking-tight text-white">
              <span className="text-lp-gold">LPNY</span> Supporter CRM
            </Link>
            <nav className="mt-1 flex flex-wrap items-center gap-3 text-sm">
              <Link href="/crm" className="font-medium text-lp-200 hover:text-white">
                Dashboard
              </Link>
              <Link href="/crm/people" className="font-medium text-lp-200 hover:text-white">
                People
              </Link>
              {staff.role !== "volunteer_staff" ? (
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
          </div>
          <div className="shrink-0 text-right text-sm">
            <div className="max-w-44 truncate font-medium text-white">{staff.displayName}</div>
            <div className="capitalize text-lp-300">{staff.role.replaceAll("_", " ")}</div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
