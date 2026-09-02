import { z } from "zod";
import { normalizeName } from "@/lib/intake/normalize";

export const taxonomyNameSchema = z
  .string()
  .transform((value) => normalizeName(value))
  .pipe(z.string().min(1, "Name is required").max(120));

export const sourceCategorySchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(
    z
      .string()
      .min(1, "Source category is required")
      .max(40)
      .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, "Use lowercase letters, numbers, hyphens, or underscores"),
  );

export function toTaxonomySlug(name: string): string {
  return normalizeName(name)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export const taxonomyIdSchema = z.string().uuid();

export const createInterestSchema = z.object({
  name: taxonomyNameSchema,
  active: z.boolean().default(true),
});

export const updateInterestSchema = z.object({
  id: taxonomyIdSchema,
  name: taxonomyNameSchema,
  active: z.boolean(),
});

export const createTagSchema = z.object({
  name: taxonomyNameSchema,
  active: z.boolean().default(true),
});

export const updateTagSchema = z.object({
  id: taxonomyIdSchema,
  name: taxonomyNameSchema,
  active: z.boolean(),
});

export const createSourceSchema = z.object({
  name: taxonomyNameSchema,
  category: sourceCategorySchema,
  active: z.boolean().default(true),
});

export const updateSourceSchema = z.object({
  id: taxonomyIdSchema,
  name: taxonomyNameSchema,
  category: sourceCategorySchema,
  active: z.boolean(),
});

export type TaxonomyActionResult = {
  status: "success" | "error";
  message: string;
};

export type InterestAdminRecord = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
};

export type TagAdminRecord = {
  id: string;
  name: string;
  active: boolean;
};

export type SourceAdminRecord = {
  id: string;
  slug: string;
  category: string;
  name: string;
  active: boolean;
};
