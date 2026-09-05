"use server";

import { revalidatePath } from "next/cache";
import { requireSupporter } from "@/lib/auth/require-supporter";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SupporterRsvpActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const supporterRsvpInitialState: SupporterRsvpActionState = {
  status: "idle",
  message: "",
};

export async function setSupporterRsvpAction(
  _previous: SupporterRsvpActionState,
  formData: FormData,
): Promise<SupporterRsvpActionState> {
  await requireSupporter();

  const eventId = String(formData.get("eventId") ?? "");
  const attending = formData.get("attending") === "true";

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId)) {
    return { status: "error", message: "That event could not be found." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("set_my_event_rsvp", {
    p_event_id: eventId,
    p_attending: attending,
  });

  if (error) {
    return {
      status: "error",
      message: "Your RSVP could not be updated. The event may no longer be available.",
    };
  }

  revalidatePath("/supporter");
  return {
    status: "success",
    message: attending ? "You’re going." : "Your RSVP has been cancelled.",
  };
}
