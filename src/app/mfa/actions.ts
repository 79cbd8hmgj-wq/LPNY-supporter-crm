"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface EnrollmentState {
  factorId: string;
  qrCode: string;
  secret: string;
  error: string | null;
}

export async function startMfaEnrollmentAction(
  previous: EnrollmentState | null,
  formData: FormData,
): Promise<EnrollmentState> {
  void previous;
  void formData;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { factorId: "", qrCode: "", secret: "", error: "Sign in before setting up MFA." };
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });

  if (error) {
    return { factorId: "", qrCode: "", secret: "", error: "Could not start MFA enrollment." };
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    error: null,
  };
}

export async function verifyMfaAction(formData: FormData) {
  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "");

  if (!factorId || !/^\d{6}$/.test(code)) {
    redirect("/mfa?error=invalid-code");
  }

  const supabase = await createServerSupabaseClient();
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });

  if (challengeError) {
    redirect("/mfa?error=challenge-failed");
  }

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (error) {
    redirect("/mfa?error=verification-failed");
  }

  redirect("/crm");
}
