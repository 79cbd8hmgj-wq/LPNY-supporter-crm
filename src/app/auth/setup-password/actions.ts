"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { invitationPasswordSchema } from "@/lib/auth/invitation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SetupPasswordState = { error: string } | null;

export async function setupPasswordAction(_previous: SetupPasswordState, formData: FormData): Promise<SetupPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");
  if (password !== confirmation) return { error: "Passwords do not match." };
  const parsed = invitationPasswordSchema.safeParse(password);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Choose a stronger password." };

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  if (!user || !user.invited_at || cookieStore.get("invitation_setup")?.value !== user.id) {
    return { error: "This invitation session is no longer valid. Request a new invitation." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: "Could not set your password. Request a new invitation and try again." };

  cookieStore.set("invitation_setup", "", { maxAge: 0, path: "/auth/setup-password" });
  redirect("/mfa");
}
