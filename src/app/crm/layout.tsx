import type { ReactNode } from "react";
import { requireStaffUser } from "@/lib/auth/require-staff";

export default async function CrmLayout({ children }: { children: ReactNode }) {
  const staff = await requireStaffUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <strong>LPNY Supporter CRM</strong>
          <div className="text-right text-sm">
            <div className="font-medium">{staff.displayName}</div>
            <div className="text-slate-500">{staff.role.replaceAll("_", " ")}</div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4">{children}</main>
    </div>
  );
}
