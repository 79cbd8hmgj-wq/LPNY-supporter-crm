import { z } from "zod";

export const interestSlugs = [
  "volunteering",
  "local-activism",
  "campaign-work",
  "running-for-office",
  "events",
  "outreach",
  "communications",
  "data-research",
  "other",
] as const;

const optionalEmail = z.union([z.literal(""), z.string().trim().email().max(254)]).optional();
const optionalPhone = z.union([
  z.literal(""),
  z.string().trim().refine((value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }, "Enter a valid phone number"),
]).optional();

export const getInvolvedInputSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: optionalEmail,
    phone: optionalPhone,
    zipCode: z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP code"),
    interests: z.array(z.enum(interestSlugs)).max(9).default([]).transform((values) => [...new Set(values)]),
    emailOptIn: z.boolean().default(false),
    phoneOptIn: z.boolean().default(false),
    website: z.string().max(200).optional().default(""),
  })
  .superRefine((value, ctx) => {
    if (!value.email?.trim() && !value.phone?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Enter an email address or phone number",
      });
    }
    if (value.emailOptIn && !value.email?.trim()) {
      ctx.addIssue({ code: "custom", path: ["emailOptIn"], message: "Email is required for email updates" });
    }
    if (value.phoneOptIn && !value.phone?.trim()) {
      ctx.addIssue({ code: "custom", path: ["phoneOptIn"], message: "Phone is required for call/text updates" });
    }
  });

export type GetInvolvedInput = z.infer<typeof getInvolvedInputSchema>;
