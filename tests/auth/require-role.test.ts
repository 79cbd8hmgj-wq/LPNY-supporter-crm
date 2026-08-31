import { describe, expect, it } from "vitest";

describe("administration role access", () => {
  it("allows Admin and State Organizer into the administration shell", async () => {
    const { isRoleAllowed } = await import("@/lib/auth/require-role");

    expect(isRoleAllowed("admin", ["admin", "state_organizer"])).toBe(true);
    expect(isRoleAllowed("state_organizer", ["admin", "state_organizer"])).toBe(true);
  });

  it("rejects County Organizer and Volunteer/Staff from the administration shell", async () => {
    const { isRoleAllowed } = await import("@/lib/auth/require-role");

    expect(isRoleAllowed("county_organizer", ["admin", "state_organizer"])).toBe(false);
    expect(isRoleAllowed("volunteer_staff", ["admin", "state_organizer"])).toBe(false);
  });
});
