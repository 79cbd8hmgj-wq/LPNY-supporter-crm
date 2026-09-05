"use client";

import { useActionState } from "react";
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

  return (
    <form action={action} className="mt-6 space-y-4">
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
  );
}
