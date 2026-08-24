import { z } from "zod";
import { resolveZipGeography } from "@/lib/intake/geography";
import {
  normalizeEmail,
  normalizeName,
  normalizePhone,
} from "@/lib/intake/normalize";

const emailSchema = z.string().email().max(254);

export type QuickAddPreparedInput = {
  firstName: string;
  lastName: string;
  email: string | null;
  normalizedEmail: string | null;
  phone: string | null;
  normalizedPhone: string | null;
  zipCode: string;
  municipality: string | null;
  countyName: string | null;
  isNewYork: boolean;
};

export type QuickAddCandidateComparable = {
  firstName: string;
  lastName: string;
  normalizedEmail: string | null;
  normalizedPhone: string | null;
  zipCode: string | null;
};

export type QuickAddMatchReason = "email" | "phone" | "name_zip";

function validPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function normalizedComparableName(value: string) {
  return normalizeName(value).toLocaleLowerCase("en-US");
}

export function prepareQuickAddInput(input: {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  zipCode: string;
}): QuickAddPreparedInput | null {
  const firstName = normalizeName(input.firstName);
  const lastName = normalizeName(input.lastName);
  const email = input.email?.trim() || null;
  const phone = input.phone?.trim() || null;
  const zipCode = input.zipCode.trim();

  if (
    firstName.length < 1
    || firstName.length > 80
    || lastName.length < 1
    || lastName.length > 80
    || !/^\d{5}$/.test(zipCode)
    || (!email && !phone)
    || (email !== null && !emailSchema.safeParse(email).success)
    || (phone !== null && !validPhone(phone))
  ) {
    return null;
  }

  try {
    const geography = resolveZipGeography(zipCode);
    return {
      firstName,
      lastName,
      email,
      normalizedEmail: normalizeEmail(email),
      phone,
      normalizedPhone: normalizePhone(phone),
      zipCode,
      municipality: geography.municipality,
      countyName: geography.countyName,
      isNewYork: geography.isNewYork,
    };
  } catch {
    return null;
  }
}

export function getQuickAddMatchReasons(
  input: QuickAddPreparedInput,
  candidate: QuickAddCandidateComparable,
): QuickAddMatchReason[] {
  const reasons: QuickAddMatchReason[] = [];

  if (
    input.normalizedEmail
    && candidate.normalizedEmail
    && input.normalizedEmail === candidate.normalizedEmail
  ) {
    reasons.push("email");
  }

  if (
    input.normalizedPhone
    && candidate.normalizedPhone
    && input.normalizedPhone === candidate.normalizedPhone
  ) {
    reasons.push("phone");
  }

  if (
    candidate.zipCode === input.zipCode
    && normalizedComparableName(candidate.firstName) === normalizedComparableName(input.firstName)
    && normalizedComparableName(candidate.lastName) === normalizedComparableName(input.lastName)
  ) {
    reasons.push("name_zip");
  }

  return reasons;
}
