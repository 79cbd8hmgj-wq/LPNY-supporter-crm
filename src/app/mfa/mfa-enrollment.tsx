"use client";

import { useActionState } from "react";
import {
  startMfaEnrollmentAction,
  verifyMfaAction,
  type EnrollmentState,
} from "./actions";

export function MfaEnrollment() {
  const [state, action, pending] = useActionState<EnrollmentState | null, FormData>(
    startMfaEnrollmentAction,
    null,
  );

  if (!state) {
    return (
      <form action={action}>
        <button
          className="rounded-md bg-lp-900 px-4 py-2 font-medium text-white disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Starting…" : "Set up authenticator"}
        </button>
      </form>
    );
  }

  if (state.error) {
    return <p role="alert">{state.error}</p>;
  }

  return (
    <div className="space-y-4">
      {/* The Supabase MFA API returns a data URI; next/image does not add value for this QR code. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="Authenticator QR code" className="h-56 w-56" src={state.qrCode} />
      <p className="text-sm text-lp-600">Scan the QR code in your authenticator app.</p>
      <p className="break-all rounded-md bg-lp-100 p-3 text-sm">Manual key: {state.secret}</p>
      <form action={verifyMfaAction} className="space-y-3">
        <input name="factorId" type="hidden" value={state.factorId} />
        <label className="block text-sm font-medium">
          6-digit code
          <input
            autoComplete="one-time-code"
            className="mt-1 w-full rounded-md border border-lp-300 bg-white p-2"
            inputMode="numeric"
            name="code"
            pattern="[0-9]{6}"
            required
          />
        </label>
        <button className="rounded-md bg-lp-900 px-4 py-2 font-medium text-white" type="submit">
          Verify and continue
        </button>
      </form>
    </div>
  );
}
