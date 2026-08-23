import type { StaffContext, StaffRecord } from "./types";

export interface StaffAccessInput {
  authUserId: string | null;
  currentAal: "aal1" | "aal2" | null;
  staff: StaffRecord | null;
}

export type StaffAccessDecision =
  | { kind: "allow"; context: StaffContext }
  | { kind: "redirect"; to: "/login" | "/mfa" | "/login?error=not-authorized" };

export function evaluateStaffAccess(input: StaffAccessInput): StaffAccessDecision {
  if (!input.authUserId) {
    return { kind: "redirect", to: "/login" };
  }

  if (input.currentAal !== "aal2") {
    return { kind: "redirect", to: "/mfa" };
  }

  if (!input.staff || input.staff.status !== "active") {
    return { kind: "redirect", to: "/login?error=not-authorized" };
  }

  return {
    kind: "allow",
    context: {
      staffUserId: input.staff.id,
      authUserId: input.authUserId,
      displayName: input.staff.display_name,
      role: input.staff.role,
      aal: input.currentAal,
    },
  };
}
