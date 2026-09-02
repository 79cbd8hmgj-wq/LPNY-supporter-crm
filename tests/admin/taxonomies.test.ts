import { describe, expect, it } from "vitest";
import {
  sourceCategorySchema,
  taxonomyNameSchema,
  toTaxonomySlug,
} from "@/lib/admin/taxonomies";

describe("taxonomy administration normalization", () => {
  it("creates deterministic slugs from display names", () => {
    expect(toTaxonomySlug("  Criminal Justice Reform  ")).toBe("criminal-justice-reform");
    expect(toTaxonomySlug("Data / Research")).toBe("data-research");
    expect(toTaxonomySlug("Café Outreach")).toBe("cafe-outreach");
  });

  it("rejects names that normalize to empty or exceed the display-name limit", () => {
    expect(taxonomyNameSchema.safeParse("   ").success).toBe(false);
    expect(taxonomyNameSchema.safeParse("x".repeat(121)).success).toBe(false);
    expect(toTaxonomySlug("***")).toBe("");
  });

  it("normalizes and validates source categories as stable machine labels", () => {
    expect(sourceCategorySchema.parse(" Website ")).toBe("website");
    expect(sourceCategorySchema.parse("event-signup")).toBe("event-signup");
    expect(sourceCategorySchema.safeParse("event signup").success).toBe(false);
    expect(sourceCategorySchema.safeParse("").success).toBe(false);
  });

  it("keeps existing slugs outside rename input so display-name changes cannot rewrite identity", () => {
    const existing = { id: "tax-1", slug: "local-activism", name: "Local activism" };
    const renamed = { ...existing, name: taxonomyNameSchema.parse("Local organizing") };
    expect(renamed.slug).toBe("local-activism");
    expect(toTaxonomySlug(renamed.name)).toBe("local-organizing");
  });
});
