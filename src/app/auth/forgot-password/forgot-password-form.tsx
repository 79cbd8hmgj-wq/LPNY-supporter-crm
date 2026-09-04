"use client";

import { useActionState } from "react";
import { forgotPasswordInitialState, requestPasswordRecoveryAction } from "./actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordRecoveryAction, forgotPasswordInitialState);
  return <form action={action} className="mt-6 space-y-4">
    {state.message ? <p className={`rounded-md border p-3 text-sm ${state.status === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-900"}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
    <label className="block text-sm font-medium">Email
      <input autoComplete="email" className="mt-1 w-full rounded-md border border-lp-300 bg-white p-2" name="email" required type="email" />
    </label>
    <button className="w-full rounded-md bg-lp-900 p-2 font-medium text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Sending…" : "Send recovery link"}</button>
  </form>;
}
