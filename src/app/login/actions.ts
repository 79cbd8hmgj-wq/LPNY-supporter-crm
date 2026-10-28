"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase());
const codeSchema = z.string().regex(/^[0-9]{6}$/);

export type EmailCodeState = { status: "idle" | "sent" | "error"; message: string };

export async function requestStaffEmailCode(_previous: EmailCodeState, form: FormData): Promise<EmailCodeState> {
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { status: "error", message: "Enter a valid email address." };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: { shouldCreateUser: false },
    });
    if (error) {
      console.error("Staff email-code delivery failed", { code: error.code, status: error.status });
      return { status: "error", message: "Unable to send a sign-in code. Email delivery may be unavailable. Contact an administrator." };
    }
  } catch {
    console.error("Staff email-code delivery failed unexpectedly");
    return { status: "error", message: "Unable to send a sign-in code. Contact an administrator." };
  }

  return { status: "sent", message: "If your staff account exists, check your email for the six-digit sign-in code." };
}

export async function verifyStaffEmailCode(_previous: EmailCodeState, form: FormData): Promise<EmailCodeState> {
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { status: "error", message: "Enter a valid email address." };
  const code = codeSchema.safeParse(form.get("token"));
  if (!code.success) return { status: "error", message: "Enter the six-digit code from your email." };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({ email: email.data, token: code.data, type: "email" });
    if (error) return { status: "error", message: "The code could not be verified. It may be invalid or expired." };
  } catch {
    return { status: "error", message: "Could not verify the sign-in code. Try again." };
  }

  // Staff authorization and verified authenticator MFA are still mandatory.
  redirect("/mfa");
}

const passwordLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

// Keep existing password/MFA route as a recovery fallback until the production
// Magic Link email template is confirmed to contain {{ .Token }}.
export async function loginAction(formData: FormData) {
  const parsed = passwordLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/login?error=invalid-input");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/login?error=invalid-credentials");
  redirect("/mfa");
}
