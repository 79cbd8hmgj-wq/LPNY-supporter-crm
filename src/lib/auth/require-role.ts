import { redirect } from "next/navigation";
import { requireStaffUser } from "./require-staff";
import type { StaffContext, StaffRole } from "./types";

export function isRoleAllowed(role: StaffRole, allowedRoles: readonly StaffRole[]): boolean {
  return allowedRoles.includes(role);
}

export async function requireStaffRole(allowedRoles: readonly StaffRole[]): Promise<StaffContext> {
  const staff = await requireStaffUser();

  if (!isRoleAllowed(staff.role, allowedRoles)) {
    redirect("/crm");
  }

  return staff;
}
