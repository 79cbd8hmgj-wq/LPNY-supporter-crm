"use client";

import { useActionState } from "react";
import { staffSignOutAction } from "./sign-out-action";

export function StaffSignOutForm() {
  const [state, formAction, pending] = useActionState(staffSignOutAction, null);

  return (
    <form action={formAction} className="ml-auto flex flex-wrap items-center gap-2">
      <button
        className="rounded-md border border-lp-300 px-3 py-1.5 font-medium text-white hover:bg-white/10 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {state?.error ? <span className="text-xs text-red-200" role="alert">{state.error}</span> : null}
    </form>
  );
}
