import { describe, expect, it } from "vitest";
import {
  staffAccessUpdateSchema,
  staffInviteSchema,
  staffTemporaryPasswordSchema,
} from "@/lib/admin/staff";

const albanyCountyId = "11111111-1111-4111-8111-111111111111";
const erieCountyId = "22222222-2222-4222-8222-222222222222";

describe("staff invitation validation", () => {
  it("normalizes email and display name and deduplicates county assignments", () => {
    expect(staffInviteSchema.parse({
      email: "  Organizer@Example.TEST ",
      displayName: "  Casey   Organizer  ",
      role: "county_organizer",
      countyIds: [albanyCountyId, albanyCountyId, erieCountyId],
    })).toEqual({
      email: "organizer@example.test",
      displayName: "Casey Organizer",
      role: "county_organizer",
      countyIds: [albanyCountyId, erieCountyId],
    });
  });

  it("rejects an invalid email or blank display name", () => {
    expect(staffInviteSchema.safeParse({
      email: "not-an-email",
      displayName: "Casey",
      role: "admin",
      countyIds: [],
    }).success).toBe(false);

    expect(staffInviteSchema.safeParse({
      email: "casey@example.test",
      displayName: "   ",
      role: "admin",
      countyIds: [],
    }).success).toBe(false);
  });

  it("requires County Organizers to have at least one county", () => {
    expect(staffInviteSchema.safeParse({
      email: "county@example.test",
      displayName: "County Organizer",
      role: "county_organizer",
      countyIds: [],
    }).success).toBe(false);
  });

  it("rejects county assignments for statewide and volunteer roles", () => {
    for (const role of ["admin", "state_organizer", "volunteer_staff"] as const) {
      expect(staffInviteSchema.safeParse({
        email: `${role}@example.test`,
        displayName: role,
        role,
        countyIds: [albanyCountyId],
      }).success).toBe(false);
    }
  });
});

describe("staff access update validation", () => {
  it("accepts a valid County Organizer access update", () => {
    expect(staffAccessUpdateSchema.parse({
      staffUserId: "33333333-3333-4333-8333-333333333333",
      role: "county_organizer",
      status: "active",
      countyIds: [erieCountyId],
    })).toEqual({
      staffUserId: "33333333-3333-4333-8333-333333333333",
      role: "county_organizer",
      status: "active",
      countyIds: [erieCountyId],
    });
  });

  it("applies the same county-role rules to access updates", () => {
    expect(staffAccessUpdateSchema.safeParse({
      staffUserId: "33333333-3333-4333-8333-333333333333",
      role: "county_organizer",
      status: "active",
      countyIds: [],
    }).success).toBe(false);

    expect(staffAccessUpdateSchema.safeParse({
      staffUserId: "33333333-3333-4333-8333-333333333333",
      role: "state_organizer",
      status: "active",
      countyIds: [erieCountyId],
    }).success).toBe(false);
  });
});

describe("staff temporary password validation", () => {
  const staffUserId = "33333333-3333-4333-8333-333333333333";

  it("accepts matching passwords that satisfy the staff password policy", () => {
    expect(staffTemporaryPasswordSchema.parse({
      staffUserId,
      password: "Temporary-access-42!",
      confirmPassword: "Temporary-access-42!",
    })).toEqual({
      staffUserId,
      password: "Temporary-access-42!",
      confirmPassword: "Temporary-access-42!",
    });
  });

  it.each([
    "Short1!",
    "alllowercase1!",
    "ALLUPPERCASE1!",
    "NoNumbersHere!",
    "NoSymbolsHere1",
  ])("rejects a weak temporary password", (password) => {
    expect(staffTemporaryPasswordSchema.safeParse({
      staffUserId,
      password,
      confirmPassword: password,
    }).success).toBe(false);
  });

  it("requires password confirmation to match", () => {
    expect(staffTemporaryPasswordSchema.safeParse({
      staffUserId,
      password: "Temporary-access-42!",
      confirmPassword: "Different-access-42!",
    }).success).toBe(false);
  });
});
