import Link from "next/link";
import { requireSupporter } from "@/lib/auth/require-supporter";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SupporterProfileForm } from "./supporter-profile-form";

export default async function EditSupporterProfilePage() {
  await requireSupporter();
  const supabase = await createServerSupabaseClient();

  const [
    { data: profiles, error: profileError },
    { data: interests, error: interestsError },
  ] = await Promise.all([
    supabase.rpc("get_my_supporter_profile"),
    supabase.rpc("list_supporter_interests"),
  ]);

  if (profileError || interestsError || !profiles?.[0]) {
    throw new Error("Unable to load supporter profile editor");
  }

  const profile = profiles[0];

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link className="text-sm font-medium text-lp-600 hover:text-lp-900" href="/supporter">
        ← Supporter portal
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Edit my profile</h1>
      <p className="mt-2 text-lp-600">
        Keep your contact information, interests, and communication preferences current.
      </p>

      <SupporterProfileForm
        interests={interests ?? []}
        profile={{
          firstName: profile.first_name,
          lastName: profile.last_name,
          email: profile.email,
          phone: profile.phone,
          zipCode: profile.zip_code,
          emailOptIn: profile.email_opt_in,
          phoneOptIn: profile.sms_opt_in || profile.phone_opt_in,
        }}
      />
    </main>
  );
}
