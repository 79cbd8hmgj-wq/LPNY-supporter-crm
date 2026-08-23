import { describe, expect, it } from "vitest";
import { resolveZipGeography } from "@/lib/intake/geography";

describe("resolveZipGeography", () => {
  it("resolves a New York ZIP to its county", () => {
    expect(resolveZipGeography("10001")).toMatchObject({ isNewYork: true, countyName: "New York" });
  });

  it("accepts valid out-of-state ZIPs without a New York county", () => {
    expect(resolveZipGeography("90210")).toMatchObject({ isNewYork: false, countyName: null });
  });

  it("rejects nonexistent ZIPs", () => {
    expect(() => resolveZipGeography("00000")).toThrow("Invalid ZIP code");
  });
});
