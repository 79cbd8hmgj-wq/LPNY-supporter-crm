"use server";

import { getServerEnv } from "@/lib/env";
import { requireSupporter } from "@/lib/auth/require-supporter";
import { supporterEmailSchema } from "@/lib/auth/supporter";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SupporterEmailActionState = {
  status: "idle" | "success" | "error";
  message: string;
};


export async function requestSupporterEmailChangeAction(
  _previous: SupporterEmailActionState,
  formData: FormData,
): Promise<SupporterEmailActionState> {
  const supporter = await requireSupporter();
  const parsed = supporterEmailSchema.safeParse(formData.get("email"));

  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const normalizedEmail = parsed.data.toLowerCase();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { status: "error", message: "Your supporter session could not be verified." };
  }

  if (user.email?.toLowerCase() === normalizedEmail) {
    return { status: "success", message: "That is already your verified email address." };
  }

  const admin = createAdminSupabaseClient();
  const { data: conflict, error: conflictError } = await admin
    .from("people")
    .select("id")
    .eq("normalized_email", normalizedEmail)
    .is("archived_at", null)
    .neq("id", supporter.personId)
    .maybeSingle();

  if (conflictError) {
    return { status: "error", message: "We could not start the email change. Please try again." };
  }

  if (conflict) {
    return { status: "error", message: "That email address is already connected to another supporter record." };
  }

  const callbackUrl = new URL("/supporter/auth/confirm", getServerEnv().APP_URL).toString();
  const { error } = await supabase.auth.updateUser(
    { email: normalizedEmail },
    { emailRedirectTo: callbackUrl },
  );

  if (error) {
    return { status: "error", message: "We could not start the email change. Please try again." };
  }

  return {
    status: "success",
    message:
      "Check your email to verify the change. Your CRM email will update only after Supabase confirms the new address.",
  };
}
