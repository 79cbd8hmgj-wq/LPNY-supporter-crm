import { describe, expect, it } from "vitest";
import { normalizeEmail, normalizeName, normalizePhone } from "@/lib/intake/normalize";

describe("intake normalization", () => {
  it("normalizes names, email and US phone numbers", () => {
    expect(normalizeName("  Mary   Ann ")).toBe("Mary Ann");
    expect(normalizeEmail(" USER@Example.COM ")).toBe("user@example.com");
    expect(normalizePhone("+1 (518) 555-1212")).toBe("5185551212");
  });
});
