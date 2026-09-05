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

const staffTemporaryPasswordValueSchema = z
  .string()
  .min(8, "Temporary password must be at least 8 characters.")
  .max(128, "Temporary password must be 128 characters or fewer.");

export const staffTemporaryPasswordSchema = z
  .object({
    staffUserId: z.string().uuid(),
    password: staffTemporaryPasswordValueSchema,
    confirmPassword: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

export type StaffInviteInput = z.infer<typeof staffInviteSchema>;
export type StaffAccessUpdateInput = z.infer<typeof staffAccessUpdateSchema>;
export type StaffTemporaryPasswordInput = z.infer<typeof staffTemporaryPasswordSchema>;
export type StaffRole = z.infer<typeof staffRoleSchema>;
export type StaffStatus = z.infer<typeof staffStatusSchema>;

export type StaffActionResult = {
  status: "success" | "error";
  message: string;
};

export type StaffCountyOption = {
  id: string;
  name: string;
};

export type StaffManagementRecord = {
  id: string;
  displayName: string;
  role: StaffRole;
  status: StaffStatus;
  invitedAt: string | null;
  countyIds: string[];
};
