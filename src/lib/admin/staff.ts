import { z } from "zod";
import { normalizeName } from "@/lib/intake/normalize";

export const staffRoleSchema = z.enum([
  "admin",
  "state_organizer",
  "county_organizer",
  "volunteer_staff",
]);

export const staffStatusSchema = z.enum(["active", "disabled"]);

const displayNameSchema = z
  .string()
  .transform((value) => normalizeName(value))
  .pipe(z.string().min(1, "Display name is required").max(120));

const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address")
  .max(254)
  .transform((value) => value.toLowerCase());

const countyIdsSchema = z
  .array(z.string().uuid())
  .max(62)
  .default([])
  .transform((values) => [...new Set(values)]);

function enforceCountyRoleRules(
  value: { role: z.infer<typeof staffRoleSchema>; countyIds: string[] },
  ctx: z.RefinementCtx,
) {
  if (value.role === "county_organizer" && value.countyIds.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["countyIds"],
      message: "County Organizers must be assigned to at least one county",
    });
  }

  if (value.role !== "county_organizer" && value.countyIds.length > 0) {
    ctx.addIssue({
      code: "custom",
      path: ["countyIds"],
      message: "County assignments are only available to County Organizers",
    });
  }
}

export const staffInviteSchema = z
  .object({
    email: emailSchema,
    displayName: displayNameSchema,
    role: staffRoleSchema,
    countyIds: countyIdsSchema,
  })
  .superRefine(enforceCountyRoleRules);

export const staffAccessUpdateSchema = z
  .object({
    staffUserId: z.string().uuid(),
    role: staffRoleSchema,
    status: staffStatusSchema,
    countyIds: countyIdsSchema,
  })
  .superRefine(enforceCountyRoleRules);

export type StaffInviteInput = z.infer<typeof staffInviteSchema>;
export type StaffAccessUpdateInput = z.infer<typeof staffAccessUpdateSchema>;
