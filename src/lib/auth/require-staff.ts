import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { evaluateStaffAccess } from "./access";
import type { StaffContext, StaffRecord } from "./types";

function normalizeAssuranceLevel(value: string | null | undefined): "aal1" | "aal2" | null {
  return value === "aal1" || value === "aal2" ? value : null;
}

export async function requireStaffUser(): Promise<StaffContext> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  let staff: StaffRecord | null = null;

  if (user) {
    const result = await supabase
      .from("staff_users")
      .select("id, display_name, role, status")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    staff = result.data as StaffRecord | null;
  }

  const decision = evaluateStaffAccess({
    authUserId: user?.id ?? null,
    currentAal: normalizeAssuranceLevel(assurance?.currentLevel),
    staff,
  });

  if (decision.kind === "redirect") {
    redirect(decision.to);
  }

  return decision.context;
}
