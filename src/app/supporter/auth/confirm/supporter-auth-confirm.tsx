"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const tokenTypes = new Set<EmailOtpType>(["invite", "magiclink", "email", "email_change", "signup"]);

export function SupporterAuthConfirm() {
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function completeSignIn() {
      const supabase = createBrowserSupabaseClient();
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const tokenHash = url.searchParams.get("token_hash");
      const type = url.searchParams.get("type") as EmailOtpType | null;
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      } else if (tokenHash && type && tokenTypes.has(type)) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
        if (verifyError) throw verifyError;
      } else if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw userError ?? new Error("No authenticated supporter session");

      const { error: claimError } = await supabase.rpc("claim_supporter_account");
      if (claimError) {
        await supabase.auth.signOut();
        throw claimError;
      }

      const { error: emailSyncError } = await supabase.rpc("sync_my_supporter_email");
      if (emailSyncError) {
        await supabase.auth.signOut();
        throw emailSyncError;
      }

      window.location.replace("/supporter");
    }

    completeSignIn().catch(() => {
      setError("This sign-in link is invalid, expired, or cannot be linked to a supporter profile.");
    });
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="text-2xl font-semibold">Signing you in…</h1>
      {error ? (
        <div className="mt-4">
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
            {error}
          </p>
          <a className="mt-4 inline-block font-medium underline" href="/supporter/sign-in">
            Request a new sign-in link
          </a>
        </div>
      ) : (
        <p className="mt-2 text-sm text-lp-600">Verifying your secure supporter link.</p>
      )}
    </main>
  );
}
