import { describe, expect, it } from "vitest";
import { getInvolvedInputSchema } from "@/lib/intake/schema";

describe("getInvolvedInputSchema", () => {
  const base = { firstName: "Ada", lastName: "Lovelace", zipCode: "10001" };

  it("requires at least one contact method", () => {
    expect(getInvolvedInputSchema.safeParse(base).success).toBe(false);
  });

  it("accepts email-only intake and deduplicates interests", () => {
    const result = getInvolvedInputSchema.parse({
      ...base,
      email: "ada@example.com",
      interests: ["events", "events", "volunteering"],
    });
    expect(result.interests).toEqual(["events", "volunteering"]);
  });

  it("rejects unknown interest slugs", () => {
    expect(getInvolvedInputSchema.safeParse({ ...base, email: "a@b.com", interests: ["not-real"] }).success).toBe(false);
  });
});
