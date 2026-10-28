"use server";

import { getAppUrl } from "@/lib/env";
import { recoveryEmailSchema } from "@/lib/auth/recovery";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ForgotPasswordState = { status: "idle" | "error" | "success"; message: string };

export const forgotPasswordInitialState: ForgotPasswordState = { status: "idle", message: "" };

export async function requestPasswordRecoveryAction(
  _previous: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = recoveryEmailSchema.safeParse(formData.get("email"));
  if (!email.success) return { status: "error", message: "Enter a valid email address." };

  let callback: URL;
  try {
    callback = new URL("/auth/confirm", getAppUrl());
  } catch {
    console.error("Password recovery request unavailable: application URL is not configured.");
    return { status: "error", message: "Password recovery is temporarily unavailable. Contact an administrator." };
  }
  callback.searchParams.set("type", "recovery");
  const supabase = await createServerSupabaseClient();
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: callback.toString() });
    if (error) {
      // Account existence must not be disclosed; never log email addresses or tokens.
      console.error("Password recovery email request failed", { code: error.code, status: error.status });
    }
  } catch {
    console.error("Password recovery email request failed unexpectedly");
    return { status: "error", message: "Password recovery is temporarily unavailable. Contact an administrator." };
  }

  return {
    status: "success",
    message: "If an account exists for that email, a password recovery link has been sent.",
  };
}
