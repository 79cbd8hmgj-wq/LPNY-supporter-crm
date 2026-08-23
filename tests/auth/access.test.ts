import { describe, expect, it } from "vitest";
import { evaluateStaffAccess } from "@/lib/auth/access";

const activeStaff = {
  id: "staff-1",
  display_name: "Test Organizer",
  role: "county_organizer" as const,
  status: "active" as const,
};

describe("evaluateStaffAccess", () => {
  it("sends unauthenticated users to login", () => {
    expect(
      evaluateStaffAccess({ authUserId: null, currentAal: null, staff: null }),
    ).toEqual({ kind: "redirect", to: "/login" });
  });

  it("requires aal2 before CRM access", () => {
    expect(
      evaluateStaffAccess({
        authUserId: "auth-1",
        currentAal: "aal1",
        staff: activeStaff,
      }),
    ).toEqual({ kind: "redirect", to: "/mfa" });
  });

  it("rejects missing staff authorization", () => {
    expect(
      evaluateStaffAccess({
        authUserId: "auth-1",
        currentAal: "aal2",
        staff: null,
      }),
    ).toEqual({ kind: "redirect", to: "/login?error=not-authorized" });
  });

  it("rejects disabled staff", () => {
    expect(
      evaluateStaffAccess({
        authUserId: "auth-1",
        currentAal: "aal2",
        staff: { ...activeStaff, status: "disabled" },
      }),
    ).toEqual({ kind: "redirect", to: "/login?error=not-authorized" });
  });

  it("returns staff context for active aal2 staff", () => {
    expect(
      evaluateStaffAccess({
        authUserId: "auth-1",
        currentAal: "aal2",
        staff: activeStaff,
      }),
    ).toEqual({
      kind: "allow",
      context: {
        staffUserId: "staff-1",
        authUserId: "auth-1",
        displayName: "Test Organizer",
        role: "county_organizer",
        aal: "aal2",
      },
    });
  });
});
