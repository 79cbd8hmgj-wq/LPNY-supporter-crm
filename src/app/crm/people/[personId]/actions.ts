"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffUser } from "@/lib/auth/require-staff";
import {
  isUuid,
  validateArchiveInput,
  validateContactOutcomeInput,
  validateDoNotContactInput,
  validateFollowUpInput,
  validateNoteInput,
  validateReassignmentInput,
  validateStageInput,
  validateTagToggleInput,
  validateTaskCompletionInput,
  validateTaxonomyToggleInput,
} from "@/lib/crm/organizer-actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RpcResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
};

type OrganizerRpcClient = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<RpcResult>;
};

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function profileUrl(personId: string, status: string) {
  return `/crm/people/${personId}?actionStatus=${encodeURIComponent(status)}`;
}

function invalidAction(personId: string) {
  redirect(isUuid(personId) ? profileUrl(personId, "invalid") : "/crm/people");
}

async function callOrganizerRpc(name: string, args: Record<string, unknown>) {
  await requireStaffUser();
  const supabase = await createServerSupabaseClient();
  const rpcClient = supabase as unknown as OrganizerRpcClient;
  const { error } = await rpcClient.rpc(name, args);

  if (error) {
    throw new Error("Unable to update this supporter right now.");
  }
}

function refreshPerson(personId: string) {
  revalidatePath("/crm");
  revalidatePath("/crm/people");
  revalidatePath(`/crm/people/${personId}`);
}

export async function recordContactOutcomeAction(formData: FormData) {
  const personId = readString(formData, "personId");
  const input = validateContactOutcomeInput({
    personId,
    outcome: readString(formData, "outcome"),
    followUpDueAt: readString(formData, "followUpDueAt"),
  });
  if (!input) invalidAction(personId);

  await callOrganizerRpc("record_contact_outcome", {
    p_person_id: input.personId,
    p_outcome: input.outcome,
    p_follow_up_due_at: input.followUpDueAt,
  });
  refreshPerson(input.personId);
  redirect(profileUrl(input.personId, input.outcome === "contacted" ? "contacted" : "unable-to-reach"));
}

export async function createFollowUpAction(formData: FormData) {
  const personId = readString(formData, "personId");
  const input = validateFollowUpInput({
    personId,
    dueAt: readString(formData, "dueAt"),
    priority: readString(formData, "priority"),
  });
  if (!input) invalidAction(personId);

  await callOrganizerRpc("create_follow_up_task", {
    p_person_id: input.personId,
    p_due_at: input.dueAt,
    p_priority: input.priority,
  });
  refreshPerson(input.personId);
  redirect(profileUrl(input.personId, "follow-up-created"));
}

export async function changeStageAction(formData: FormData) {
  const personId = readString(formData, "personId");
  const input = validateStageInput({ personId, stage: readString(formData, "stage") });
  if (!input) invalidAction(personId);

  await callOrganizerRpc("change_person_stage", {
    p_person_id: input.personId,
    p_stage: input.stage,
  });
  refreshPerson(input.personId);
  redirect(profileUrl(input.personId, "stage-updated"));
}

export async function addNoteAction(formData: FormData) {
  const personId = readString(formData, "personId");
  const input = validateNoteInput({ personId, body: readString(formData, "body") });
  if (!input) invalidAction(personId);

  await callOrganizerRpc("add_person_note", {
    p_person_id: input.personId,
    p_body: input.body,
  });
  refreshPerson(input.personId);
  redirect(profileUrl(input.personId, "note-added"));
}

export async function setRelationshipAction(formData: FormData) {
  const personId = readString(formData, "personId");
  const input = validateTaxonomyToggleInput({
    personId,
    slug: readString(formData, "slug"),
    enabled: readString(formData, "enabled"),
  });
  if (!input) invalidAction(personId);

  await callOrganizerRpc("set_person_relationship", {
    p_person_id: input.personId,
    p_relationship_slug: input.slug,
    p_enabled: input.enabled,
  });
  refreshPerson(input.personId);
  redirect(profileUrl(input.personId, "relationship-updated"));
}

export async function setInterestAction(formData: FormData) {
  const personId = readString(formData, "personId");
  const input = validateTaxonomyToggleInput({
    personId,
    slug: readString(formData, "slug"),
    enabled: readString(formData, "enabled"),
  });
  if (!input) invalidAction(personId);

  await callOrganizerRpc("set_person_interest", {
    p_person_id: input.personId,
    p_interest_slug: input.slug,
    p_enabled: input.enabled,
  });
  refreshPerson(input.personId);
  redirect(profileUrl(input.personId, "interest-updated"));
}

export async function setTagAction(formData: FormData) {
  const personId = readString(formData, "personId");
  const input = validateTagToggleInput({
    personId,
    tagId: readString(formData, "tagId"),
    enabled: readString(formData, "enabled"),
  });
  if (!input) invalidAction(personId);

  await callOrganizerRpc("set_person_tag", {
    p_person_id: input.personId,
    p_tag_id: input.tagId,
    p_enabled: input.enabled,
  });
  refreshPerson(input.personId);
  redirect(profileUrl(input.personId, "tag-updated"));
}

export async function reassignPersonAction(formData: FormData) {
  const personId = readString(formData, "personId");
  const input = validateReassignmentInput({
    personId,
    staffUserId: readString(formData, "staffUserId"),
  });
  if (!input) invalidAction(personId);

  await callOrganizerRpc("reassign_person", {
    p_person_id: input.personId,
    p_assigned_staff_user_id: input.staffUserId,
  });
  refreshPerson(input.personId);
  redirect(profileUrl(input.personId, "reassigned"));
}

export async function setDoNotContactAction(formData: FormData) {
  const personId = readString(formData, "personId");
  const input = validateDoNotContactInput({
    personId,
    enabled: readString(formData, "enabled"),
  });
  if (!input) invalidAction(personId);

  await callOrganizerRpc("set_person_do_not_contact", {
    p_person_id: input.personId,
    p_do_not_contact: input.enabled,
  });
  refreshPerson(input.personId);
  redirect(profileUrl(input.personId, "do-not-contact-updated"));
}

export async function completeTaskAction(formData: FormData) {
  const personId = readString(formData, "personId");
  const input = validateTaskCompletionInput({
    personId,
    taskId: readString(formData, "taskId"),
  });
  if (!input) invalidAction(personId);

  await callOrganizerRpc("complete_person_task", { p_task_id: input.taskId });
  refreshPerson(input.personId);
  redirect(profileUrl(input.personId, "task-completed"));
}

export async function archivePersonAction(formData: FormData) {
  const personId = readString(formData, "personId");
  const input = validateArchiveInput({
    personId,
    confirmation: readString(formData, "confirmation"),
  });
  if (!input) invalidAction(personId);

  await callOrganizerRpc("archive_person", { p_person_id: input.personId });
  refreshPerson(input.personId);
  redirect("/crm/people?profileStatus=archived");
}
