"use server";

import { revalidatePath } from "next/cache";
import { requireStaffUser } from "@/lib/auth/require-staff";
import { eventRpcErrorResult } from "@/lib/crm/work-event-errors";
import { validateEventInput, validateTaskInput, type WorkItemResult } from "@/lib/crm/work-items";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function fields(formData: FormData) {
  return Object.fromEntries(formData.entries());
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
  if (error) return eventRpcErrorResult(error);
  revalidatePath("/crm/work");
  return { status: "success", message: "Event created." };
}
