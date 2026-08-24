import { describe, expect, it } from "vitest";
import {
  getQuickAddMatchReasons,
  prepareQuickAddInput,
} from "@/lib/crm/quick-add";

const validInput = {
  firstName: "  Avery ",
  lastName: " Organizer  ",
  email: " Avery.Organizer@Example.TEST ",
  phone: "+1 (518) 555-0123",
  zipCode: "12207",
};

describe("Quick Add input preparation", () => {
  it("normalizes the minimum organizer entry fields and resolves New York geography", () => {
    expect(prepareQuickAddInput(validInput)).toEqual({
      firstName: "Avery",
      lastName: "Organizer",
      email: "Avery.Organizer@Example.TEST",
      normalizedEmail: "avery.organizer@example.test",
      phone: "+1 (518) 555-0123",
      normalizedPhone: "5185550123",
      zipCode: "12207",
      municipality: "Albany",
      countyName: "Albany",
      isNewYork: true,
    });
  });

  it("accepts either email or phone but rejects a missing contact method", () => {
    expect(prepareQuickAddInput({ ...validInput, email: "" })).not.toBeNull();
    expect(prepareQuickAddInput({ ...validInput, phone: "" })).not.toBeNull();
    expect(prepareQuickAddInput({ ...validInput, email: "", phone: "" })).toBeNull();
  });

  it("rejects invalid names, contact values, and ZIP codes", () => {
    expect(prepareQuickAddInput({ ...validInput, firstName: "" })).toBeNull();
    expect(prepareQuickAddInput({ ...validInput, email: "not-an-email", phone: "" })).toBeNull();
    expect(prepareQuickAddInput({ ...validInput, phone: "123", email: "" })).toBeNull();
    expect(prepareQuickAddInput({ ...validInput, zipCode: "00000" })).toBeNull();
  });
});

describe("Quick Add duplicate warning reasons", () => {
  const prepared = prepareQuickAddInput(validInput)!;

  it("flags exact normalized email and same-name ZIP matches", () => {
    expect(getQuickAddMatchReasons(prepared, {
      firstName: "Avery",
      lastName: "Organizer",
      normalizedEmail: "avery.organizer@example.test",
      normalizedPhone: null,
      zipCode: "12207",
    })).toEqual(["email", "name_zip"]);
  });

  it("flags normalized phone matches independently", () => {
    expect(getQuickAddMatchReasons(prepared, {
      firstName: "Different",
      lastName: "Person",
      normalizedEmail: null,
      normalizedPhone: "5185550123",
      zipCode: "12000",
    })).toEqual(["phone"]);
  });

  it("returns no warning reasons for an unrelated visible person", () => {
    expect(getQuickAddMatchReasons(prepared, {
      firstName: "Other",
      lastName: "Supporter",
      normalizedEmail: "other@example.test",
      normalizedPhone: "5185559999",
      zipCode: "12208",
    })).toEqual([]);
  });
});
