"use client";

import { useActionState } from "react";
import {
  requestSupporterEmailChangeAction,
  supporterEmailInitialState,
} from "./email-actions";

const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-lp-300 bg-white px-3 py-2 text-base text-lp-950";

export function SupporterEmailForm({ email }: { email: string | null }) {
  const [state, action, pending] = useActionState(
    requestSupporterEmailChangeAction,
    supporterEmailInitialState,
  );

  return (
    <form action={action} className="mt-5 space-y-3">
      {state.message ? (
        <p
          className={`rounded-lg p-3 text-sm ${
            state.status === "error"
              ? "bg-red-50 text-red-800"
              : "bg-emerald-50 text-emerald-800"
          }`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}

      <label className="block text-sm font-medium">
        Email
        <input
          className={inputClass}
          defaultValue={email ?? ""}
          name="email"
          required
          type="email"
        />
      </label>

      <button
        className="min-h-11 rounded-lg border border-lp-navy px-4 py-2 font-semibold text-lp-navy disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Sending verification…" : "Change email"}
      </button>

      <p className="text-xs leading-5 text-lp-500">
        Email changes are not applied until the new address is verified.
      </p>
    </form>
  );
}
