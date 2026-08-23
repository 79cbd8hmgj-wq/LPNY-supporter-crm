import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { resolveZipGeography } from "./geography";
import { normalizeEmail, normalizeName, normalizePhone } from "./normalize";
import type { GetInvolvedInput } from "./schema";

export async function processGetInvolvedSubmission(input: GetInvolvedInput): Promise<void> {
  const geography = resolveZipGeography(input.zipCode.trim());
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);
  const admin = createAdminSupabaseClient();

  const { error } = await admin.rpc("process_get_involved_intake", {
    p_first_name: normalizeName(input.firstName),
    p_last_name: normalizeName(input.lastName),
    p_email: input.email?.trim() || null,
    p_normalized_email: normalizedEmail,
    p_phone: input.phone?.trim() || null,
    p_normalized_phone: normalizedPhone,
    p_zip_code: geography.zipCode,
    p_county_name: geography.countyName,
    p_municipality: geography.municipality,
    p_interest_slugs: input.interests,
    p_email_opt_in: input.emailOptIn,
    p_phone_opt_in: input.phoneOptIn,
  });

  if (error) {
    throw new Error(`Supporter intake RPC failed: ${error.code ?? "database_error"}`);
  }
}
