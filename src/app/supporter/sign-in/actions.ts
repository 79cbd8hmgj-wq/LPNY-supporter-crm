"use server";

import { createClient } from "@supabase/supabase-js";
import { getServerEnv, env } from "@/lib/env";
import {
  supporterEmailSchema,
  supporterSignInGenericMessage,
} from "@/lib/auth/supporter";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export type SupporterSignInState = {
  status: "idle" | "error" | "success";
  message: string;
};

export const supporterSignInInitialState: SupporterSignInState = {
  status: "idle",
  message: "",
};

function createPasswordlessEmailClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: "implicit",
      },
    },
  );
}

export async function requestSupporterSignInAction(
  _previous: SupporterSignInState,
  formData: FormData,
): Promise<SupporterSignInState> {
  const parsed = supporterEmailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const normalizedEmail = parsed.data.toLowerCase();
  const admin = createAdminSupabaseClient();
  const { data: person, error: personError } = await admin
    .from("people")
    .select("id, email")
    .eq("normalized_email", normalizedEmail)
    .is("archived_at", null)
    .maybeSingle();

  // Do not reveal whether a supporter record exists or is portal-eligible.
  if (personError || !person) {
    return { status: "success", message: supporterSignInGenericMessage };
  }

  const { data: supporterRelationshipType, error: supporterRelationshipTypeError } = await admin
    .from("relationship_types")
    .select("id")
    .eq("slug", "supporter")
    .eq("active", true)
    .maybeSingle();

  if (supporterRelationshipTypeError || !supporterRelationshipType) {
    return { status: "success", message: supporterSignInGenericMessage };
  }

  const { data: supporterRelationship, error: supporterRelationshipError } = await admin
    .from("person_relationships")
    .select("person_id")
    .eq("person_id", person.id)
    .eq("relationship_type_id", supporterRelationshipType.id)
    .maybeSingle();

  if (supporterRelationshipError || !supporterRelationship) {
    return { status: "success", message: supporterSignInGenericMessage };
  }

  const callbackUrl = new URL("/supporter/auth/confirm", getServerEnv().APP_URL).toString();
  const deliveryEmail = person.email?.trim() || parsed.data;

  // First-time portal users can be provisioned without enabling public Auth
  // signup. Existing Auth users (including staff who are also supporters) fall
  // back to a passwordless magic link.
  const invitation = await admin.auth.admin.inviteUserByEmail(deliveryEmail, {
    redirectTo: callbackUrl,
  });

  if (invitation.error) {
    const auth = createPasswordlessEmailClient();
    await auth.auth.signInWithOtp({
      email: deliveryEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: callbackUrl,
      },
    });
  }

  return { status: "success", message: supporterSignInGenericMessage };
}
