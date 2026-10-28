"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type StaffSignOutState = { error: string } | null;

const SIGN_OUT_ERROR = "Unable to sign out. Please try again.";

export async function staffSignOutAction(
  _previousState: StaffSignOutState,
  _formData: FormData,
): Promise<StaffSignOutState> {
  try {
    const supabase = await createServerSupabaseClient();
    // Only end the session on this device, not the user's other devices.
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return { error: SIGN_OUT_ERROR };
  } catch {
    // Never redirect to login as though sign-out succeeded.
    return { error: SIGN_OUT_ERROR };
  }

  revalidatePath("/crm", "layout");
  redirect("/login");
}
