"use server";

import { getServerEnv } from "@/lib/env";
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

  const callback = new URL("/auth/confirm", getServerEnv().APP_URL);
  callback.searchParams.set("type", "recovery");
  const supabase = await createServerSupabaseClient();
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: callback.toString() });

  return {
    status: "success",
    message: "If an account exists for that email, a password recovery link has been sent.",
  };
}
