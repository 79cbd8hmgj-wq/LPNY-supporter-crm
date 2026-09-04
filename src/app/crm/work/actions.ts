"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireStaffUser } from "@/lib/auth/require-staff";
import { validateEventInput, validateTaskInput, type WorkItemResult } from "@/lib/crm/work-items";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RpcError = { code?: string; message: string };

function fields(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function eventErrorResult(error: RpcError): WorkItemResult {
  if (error.code === "42501" || error.code === "PGRST301") {
    return {
      status: "error",
      message: "Your staff session has expired or is no longer authorized. Sign in again, then retry creating the event.",
    };
  }

  if (error.code === "22023") {
    return {
      status: "error",
      message: "The event details were rejected. Correct the title and event times, then submit the form again.",
    };
  }

  if (
    error.code?.startsWith("08") ||
    error.code?.startsWith("53") ||
    ["57P01", "57P02", "57P03", "58000", "PGRST000", "PGRST001", "PGRST002", "PGRST003"].includes(error.code ?? "")
  ) {
    return {
      status: "error",
      message: "The event service is temporarily unavailable. Wait a moment and retry; your event was not created.",
    };
  }

  const contextId = randomUUID();
  console.error("Unexpected create_crm_event RPC failure", {
    code: error.code ?? "unknown",
    contextId,
  });
  return {
    status: "error",
    message: `The event could not be created. Retry later. If the problem continues, share reference ${contextId} with support.`,
  };
}

export async function createTaskAction(_: WorkItemResult, formData: FormData): Promise<WorkItemResult> {
  await requireStaffUser();
  const input = validateTaskInput(fields(formData));
  if (!input) return { status: "error", message: "Choose a supporter and enter a title, due date, and priority." };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("create_person_task", { p_person_id: input.personId, p_task_type: input.title, p_due_at: input.dueAt, p_priority: input.priority });
  if (error) return { status: "error", message: "The task could not be created. Check that you can access this supporter." };
  revalidatePath("/crm"); revalidatePath("/crm/work"); revalidatePath(`/crm/people/${input.personId}`);
  return { status: "success", message: "Task created." };
}

export async function createEventAction(_: WorkItemResult, formData: FormData): Promise<WorkItemResult> {
  await requireStaffUser();
  const input = validateEventInput(fields(formData));
  if (!input) return { status: "error", message: "Enter a title and valid event times. The end must be after the start." };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("create_crm_event", { p_title: input.title, p_description: input.description, p_location: input.location, p_starts_at: input.startsAt, p_ends_at: input.endsAt });
  if (error) return eventErrorResult(error);
  revalidatePath("/crm/work");
  return { status: "success", message: "Event created." };
}
