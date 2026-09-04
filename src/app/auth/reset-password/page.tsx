import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const marker = (await cookies()).get("password_recovery")?.value;
  if (!user || marker !== user.id) redirect("/login?error=invalid-recovery");

  return <main className="mx-auto max-w-md p-6 pt-16">
    <h1 className="text-2xl font-semibold">Choose a new password</h1>
    <p className="mt-2 text-sm text-lp-600">After resetting your password, you’ll complete the usual multi-factor authentication check.</p>
    <ResetPasswordForm />
  </main>;
}
