"use client";

import { useActionState, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { requestSupporterSignInAction } from "./actions";
import type { SupporterSignInState } from "./actions";

const supporterSignInInitialState: SupporterSignInState = {
  status: "idle",
  message: "",
};

export function SupporterSignInForm() {
  const [state, action, pending] = useActionState(
    requestSupporterSignInAction,
    supporterSignInInitialState,
  );
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);

  async function signInWithGoogle() {
    setGoogleError(null);
    setGooglePending(true);

    const supabase = createBrowserSupabaseClient();
    const redirectTo = new URL("/supporter/auth/confirm", window.location.origin).toString();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      setGoogleError("Google sign-in could not be started. Try again or use the email option below.");
      setGooglePending(false);
    }
  }

  return (
    <div className="mt-6 space-y-5">
      <button
        className="min-h-12 w-full rounded-md border border-lp-300 bg-white p-2 font-medium text-lp-950 hover:bg-lp-50 disabled:opacity-60"
        disabled={googlePending}
        onClick={signInWithGoogle}
        type="button"
      >
        {googlePending ? "Opening Google…" : "Continue with Google"}
      </button>

      {googleError ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {googleError}
        </p>
      ) : null}

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-lp-500">
        <span className="h-px flex-1 bg-lp-200" />
        <span>or use email</span>
        <span className="h-px flex-1 bg-lp-200" />
      </div>

      <form action={action} className="space-y-4">
        {state.message ? (
          <p
            className={`rounded-md border p-3 text-sm ${
              state.status === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-green-200 bg-green-50 text-green-900"
            }`}
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </p>
        ) : null}

        <label className="block text-sm font-medium">
          Email
          <input
            autoComplete="email"
            className="mt-1 min-h-12 w-full rounded-md border border-lp-300 bg-white p-2"
            inputMode="email"
            name="email"
            required
            type="email"
          />
        </label>

        <button
          className="min-h-12 w-full rounded-md bg-lp-900 p-2 font-medium text-white disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>
    </div>
  );
}
