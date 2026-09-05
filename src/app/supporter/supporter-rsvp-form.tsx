"use client";

import { useActionState } from "react";
import { setSupporterRsvpAction } from "./rsvp-actions";
import type { SupporterRsvpActionState } from "./rsvp-actions";

const supporterRsvpInitialState: SupporterRsvpActionState = {
  status: "idle",
  message: "",
};

export function SupporterRsvpForm({
  eventId,
  status,
}: {
  eventId: string;
  status: "going" | "cancelled" | null;
}) {
  const [state, action, pending] = useActionState(
    setSupporterRsvpAction,
    supporterRsvpInitialState,
  );
  const going = status === "going";

  return (
    <form action={action} className="mt-3">
      <input name="eventId" type="hidden" value={eventId} />
      <input name="attending" type="hidden" value={going ? "false" : "true"} />
      <button
        className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold ${
          going
            ? "border border-lp-300 bg-white text-lp-800"
            : "bg-lp-navy text-white"
        }`}
        disabled={pending}
        type="submit"
      >
        {pending ? "Updating…" : going ? "Cancel RSVP" : "I’m going"}
      </button>
      {state.message ? (
        <p
          className={`mt-2 text-sm ${
            state.status === "error" ? "text-red-700" : "text-emerald-700"
          }`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
