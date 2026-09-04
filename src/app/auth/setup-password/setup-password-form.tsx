"use client";

import { useActionState } from "react";
import { setupPasswordAction, type SetupPasswordState } from "./actions";

export function SetupPasswordForm() {
  const [state, action, pending] = useActionState<SetupPasswordState, FormData>(setupPasswordAction, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      {state?.error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{state.error}</p> : null}
      <label className="block text-sm font-medium">Password
        <input autoComplete="new-password" className="mt-1 w-full rounded-md border border-lp-300 bg-white p-2" minLength={12} name="password" required type="password" />
      </label>
      <label className="block text-sm font-medium">Confirm password
        <input autoComplete="new-password" className="mt-1 w-full rounded-md border border-lp-300 bg-white p-2" minLength={12} name="confirmPassword" required type="password" />
      </label>
      <p className="text-sm text-lp-600">Use at least 12 characters, including uppercase, lowercase, a number, and a symbol.</p>
      <button className="rounded-md bg-lp-900 px-4 py-2 font-medium text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Saving…" : "Set password and continue"}</button>
    </form>
  );
}
