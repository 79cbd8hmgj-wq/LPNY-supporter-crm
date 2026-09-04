import { redirect } from "next/navigation";
import type { SupporterContext } from "@/lib/auth/supporter";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireSupporter(): Promise<SupporterContext> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/supporter/sign-in");
  }

  const { data: account, error } = await supabase
    .from("supporter_accounts")
    .select("person_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !account) {
    redirect("/supporter/sign-in?error=not-linked");
  }

  return {
    authUserId: user.id,
    personId: account.person_id,
  };
}
