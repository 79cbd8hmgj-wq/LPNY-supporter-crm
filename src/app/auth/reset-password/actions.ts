"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { staffPasswordSchema } from "@/lib/auth/recovery";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ResetPasswordState = { error: string } | null;

export async function resetPasswordAction(_previous: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");
  if (password !== confirmation) return { error: "Passwords do not match." };
  const parsed = staffPasswordSchema.safeParse(password);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Choose a stronger password." };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  if (!user || cookieStore.get("password_recovery")?.value !== user.id) {
    return { error: "This recovery link is invalid, expired, or has already been used. Request a new link." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: "This recovery link could not be used. Request a new link and try again." };

  cookieStore.set("password_recovery", "", { maxAge: 0, path: "/auth/reset-password" });
  redirect("/mfa");
}
