import { resolveZipGeography } from "@/lib/intake/geography";
import { normalizeName, normalizePhone } from "@/lib/intake/normalize";

export type SupporterProfilePreparedInput = {
  firstName: string;
  lastName: string;
  phone: string | null;
  normalizedPhone: string | null;
  zipCode: string;
  municipality: string | null;
  countyName: string | null;
  interestSlugs: string[];
  emailOptIn: boolean;
  phoneOptIn: boolean;
};

function validPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function validInterestSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function prepareSupporterProfileInput(input: {
  firstName: string;
  lastName: string;
  phone?: string | null;
  zipCode: string;
  interestSlugs: string[];
  emailOptIn: boolean;
  phoneOptIn: boolean;
}): SupporterProfilePreparedInput | null {
  const firstName = normalizeName(input.firstName);
  const lastName = normalizeName(input.lastName);
  const phone = input.phone?.trim() || null;
  const zipCode = input.zipCode.trim();
  const interestSlugs = Array.from(
    new Set(input.interestSlugs.map((slug) => slug.trim().toLowerCase())),
  );

  if (
    firstName.length < 1
    || firstName.length > 80
    || lastName.length < 1
    || lastName.length > 80
    || !/^\d{5}$/.test(zipCode)
    || (phone !== null && !validPhone(phone))
    || (input.phoneOptIn && phone === null)
    || interestSlugs.length > 50
    || interestSlugs.some((slug) => !validInterestSlug(slug))
  ) {
    return null;
  }

  try {
    const geography = resolveZipGeography(zipCode);
    return {
      firstName,
      lastName,
      phone,
      normalizedPhone: normalizePhone(phone),
      zipCode,
      municipality: geography.municipality,
      countyName: geography.countyName,
      interestSlugs,
      emailOptIn: input.emailOptIn,
      phoneOptIn: input.phoneOptIn,
    };
  } catch {
    return null;
  }
}
