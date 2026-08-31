import type { StaffRole } from "./types";

export function isRoleAllowed(role: StaffRole, allowedRoles: readonly StaffRole[]): boolean {
  return allowedRoles.includes(role);
}
