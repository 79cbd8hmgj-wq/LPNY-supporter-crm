import { redirect } from "next/navigation";
import { requireStaffUser } from "./require-staff";
import { isRoleAllowed } from "./role-access";
import type { StaffContext, StaffRole } from "./types";

export async function requireStaffRole(allowedRoles: readonly StaffRole[]): Promise<StaffContext> {
  const staff = await requireStaffUser();

  if (!isRoleAllowed(staff.role, allowedRoles)) {
    redirect("/crm");
  }

  return staff;
}
