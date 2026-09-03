import Link from "next/link";
import { requireStaffRole } from "@/lib/auth/require-role";
import { loadStaffAdministrationData } from "@/lib/admin/staff-data";
import { StaffManagement } from "./staff-management";

export default async function StaffAdministrationPage() {
  await requireStaffRole(["admin"]);
  const data = await loadStaffAdministrationData();

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm font-medium text-lp-600 hover:text-lp-950 hover:underline" href="/crm/admin">
          ← Administration
        </Link>
        <p className="mt-4 text-sm font-medium uppercase tracking-wide text-lp-500">Admin only</p>
        <h1 className="mt-1 text-2xl font-semibold text-lp-950 sm:text-3xl">Staff access</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-lp-600 sm:text-base">
          Invite staff, change CRM roles, assign County Organizers to their working counties, and disable or restore access. These controls are enforced again by the database.
        </p>
      </div>
      <StaffManagement counties={data.counties} staff={data.staff} />
    </section>
  );
}
