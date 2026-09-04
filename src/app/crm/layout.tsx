import Link from "next/link";
import type { ReactNode } from "react";
import { requireStaffUser } from "@/lib/auth/require-staff";
import { getBuildMetadata } from "@/lib/deployment/build-metadata";
import { CrmNavigation } from "./crm-navigation";

export default async function CrmLayout({ children }: { children: ReactNode }) {
  const staff = await requireStaffUser();
  const build = getBuildMetadata();

  return (
    <div className="min-h-screen bg-lp-50 text-lp-950">
      <header className="border-b-4 border-lp-gold bg-lp-navy text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <Link href="/crm" className="font-semibold tracking-tight text-white">
              <span className="text-lp-gold">LPNY</span> Supporter CRM
            </Link>
          </div>
          <div className="shrink-0 text-right text-sm">
            <div className="max-w-44 truncate font-medium text-white">{staff.displayName}</div>
            <div className="capitalize text-lp-300">{staff.role.replaceAll("_", " ")}</div>
          </div>
          <CrmNavigation role={staff.role} />
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
      <footer className="mx-auto max-w-7xl px-4 pb-4 text-right text-xs text-lp-600 sm:px-6">
        Release <span className="font-mono">{build.release}</span>
      </footer>
    </div>
  );
}
