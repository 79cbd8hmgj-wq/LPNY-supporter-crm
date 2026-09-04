import { describe, expect, it } from "vitest";
import { prepareSupporterProfileInput } from "@/lib/supporter/profile";

describe("prepareSupporterProfileInput", () => {
  it("normalizes a valid supporter profile update", () => {
    expect(
      prepareSupporterProfileInput({
        firstName: "  Portal  ",
        lastName: " Supporter ",
        phone: "(315) 555-0199",
        zipCode: "13202",
        interestSlugs: ["events", "volunteering", "events"],
        emailOptIn: true,
        phoneOptIn: true,
      }),
    ).toEqual({
      firstName: "Portal",
      lastName: "Supporter",
      phone: "(315) 555-0199",
      normalizedPhone: "3155550199",
      zipCode: "13202",
      municipality: "Syracuse",
      countyName: "Onondaga",
      interestSlugs: ["events", "volunteering"],
      emailOptIn: true,
      phoneOptIn: true,
    });
  });

  it("allows a supporter to remove their phone and phone consent together", () => {
    expect(
      prepareSupporterProfileInput({
        firstName: "Portal",
        lastName: "Supporter",
        phone: "",
        zipCode: "12207",
        interestSlugs: [],
        emailOptIn: false,
        phoneOptIn: false,
      }),
    ).toMatchObject({
      phone: null,
      normalizedPhone: null,
      interestSlugs: [],
      phoneOptIn: false,
    });
  });

  it("rejects phone consent without a phone number", () => {
    expect(
      prepareSupporterProfileInput({
        firstName: "Portal",
        lastName: "Supporter",
        phone: "",
        zipCode: "12207",
        interestSlugs: [],
        emailOptIn: false,
        phoneOptIn: true,
      }),
    ).toBeNull();
  });

  it("rejects invalid names, ZIPs, phones, and interest slugs", () => {
    const base = {
      firstName: "Portal",
      lastName: "Supporter",
      phone: "3155550199",
      zipCode: "12207",
      interestSlugs: ["events"],
      emailOptIn: true,
      phoneOptIn: true,
    };

    expect(prepareSupporterProfileInput({ ...base, firstName: "" })).toBeNull();
    expect(prepareSupporterProfileInput({ ...base, zipCode: "123" })).toBeNull();
    expect(prepareSupporterProfileInput({ ...base, phone: "12" })).toBeNull();
    expect(prepareSupporterProfileInput({ ...base, interestSlugs: ["Events!"] })).toBeNull();
  });
});
