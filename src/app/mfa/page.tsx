import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { verifyMfaAction } from "./actions";
import { MfaEnrollment } from "./mfa-enrollment";

const errorMessages: Record<string, string> = {
  "invalid-code": "Enter the 6-digit code from your authenticator app.",
  "challenge-failed": "Could not start MFA verification. Try again.",
  "verification-failed": "That verification code was not accepted.",
};

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance?.currentLevel === "aal2") {
    redirect("/crm");
  }

  const { data } = await supabase.auth.mfa.listFactors();
  const verified = data?.totp.find((factor) => factor.status === "verified");
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : null;

  return (
    <main className="mx-auto max-w-md p-6 pt-16">
      <h1 className="text-2xl font-semibold">Multi-factor authentication</h1>
      <p className="mt-2 text-sm text-slate-600">CRM access requires a verified authenticator factor.</p>
      {errorMessage ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {verified ? (
        <form action={verifyMfaAction} className="mt-6 space-y-3">
          <input name="factorId" type="hidden" value={verified.id} />
          <label className="block text-sm font-medium">
            6-digit code
            <input
              autoComplete="one-time-code"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2"
              inputMode="numeric"
              name="code"
              pattern="[0-9]{6}"
              required
            />
          </label>
          <button className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white" type="submit">
            Verify
          </button>
        </form>
      ) : (
        <div className="mt-6">
          <MfaEnrollment />
        </div>
      )}
    </main>
  );
}
