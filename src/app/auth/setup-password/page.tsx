import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SetupPasswordForm } from "./setup-password-form";

export default async function SetupPasswordPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const marker = (await cookies()).get("invitation_setup")?.value;
  if (!user || !user.invited_at || marker !== user.id) redirect("/login?error=invalid-invitation");

  return <main className="mx-auto max-w-md p-6 pt-16">
    <h1 className="text-2xl font-semibold">Set up your staff account</h1>
    <p className="mt-2 text-sm text-lp-600">Choose your initial password. Next, you’ll secure your account with an authenticator app.</p>
    <SetupPasswordForm />
  </main>;
}
