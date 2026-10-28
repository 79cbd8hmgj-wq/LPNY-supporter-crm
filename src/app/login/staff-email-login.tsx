"use client";

import { useActionState, useState } from "react";
import {
  requestStaffEmailCode,
  verifyStaffEmailCode,
  type EmailCodeState,
} from "./actions";

const emailCodeInitialState: EmailCodeState = { status: "idle", message: "" };

export function StaffEmailLogin() {
  const [email, setEmail] = useState("");
  const [requestState, requestAction, requestPending] = useActionState(requestStaffEmailCode, emailCodeInitialState);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyStaffEmailCode, emailCodeInitialState);

  return (
    <div className="mt-6 space-y-6">
      <form action={requestAction} className="space-y-4">
        <label className="block text-sm font-medium">
          Email
          <input
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-lp-300 bg-white p-2"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <button disabled={requestPending} className="w-full rounded-md bg-lp-900 p-2 font-medium text-white disabled:opacity-50" type="submit">
          {requestPending ? "Sending code…" : "Email me a sign-in code"}
        </button>
        {requestState.message && (
          <p role={requestState.status === "error" ? "alert" : "status"} className="text-sm">
            {requestState.message}
          </p>
        )}
      </form>
      {requestState.status === "sent" && (
        <form action={verifyAction} className="space-y-4 border-t border-lp-300 pt-5">
          <input type="hidden" name="email" value={email} />
          <label className="block text-sm font-medium">
            Six-digit code from email
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              className="mt-1 w-full rounded-md border border-lp-300 bg-white p-2"
              name="token"
              required
            />
          </label>
          <button disabled={verifyPending} className="w-full rounded-md bg-lp-900 p-2 font-medium text-white disabled:opacity-50" type="submit">
            {verifyPending ? "Verifying…" : "Verify code and continue to MFA"}
          </button>
          {verifyState.message && <p role="alert" className="text-sm text-red-700">{verifyState.message}</p>}
        </form>
      )}
    </div>
  );
}
