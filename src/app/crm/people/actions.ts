"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffUser } from "@/lib/auth/require-staff";
import {
  parsePeopleFilters,
  serializePeopleFilters,
} from "@/lib/crm/people-filters";
import { readPeopleSearchQuery } from "@/lib/crm/people-search-state";
import { encodeSavedViewFilters } from "@/lib/crm/saved-views";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function canonicalFilters(raw: string) {
  return parsePeopleFilters(new URLSearchParams(raw.slice(0, 5000)));
}

function hasPrivateSearch(raw: string) {
  return new URLSearchParams(raw.slice(0, 5000)).get("search") === "1";
}

async function peopleUrl(rawQuery: string, status: string) {
  const filters = canonicalFilters(rawQuery);
  const query = await readPeopleSearchQuery(hasPrivateSearch(rawQuery));
  const params = serializePeopleFilters({ ...filters, query, page: 1 });
  params.set("savedViewStatus", status);
  return `/crm/people?${params.toString()}`;
}

function validName(raw: string) {
  const name = raw.trim().replace(/\s+/g, " ");
  return name.length >= 1 && name.length <= 80 ? name : null;
}

export async function createSavedViewAction(formData: FormData) {
  const name = validName(readString(formData, "name"));
  const rawFilters = readString(formData, "filters");
  const query = readString(formData, "query");
  const returnQuery = readString(formData, "returnQuery");

  if (!name) {
    redirect(await peopleUrl(returnQuery, "invalid-name"));
  }

  const staff = await requireStaffUser();
  const filters = canonicalFilters(rawFilters);
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("saved_views").insert({
    staff_user_id: staff.staffUserId,
    name,
    filters: encodeSavedViewFilters({ ...filters, query }),
  });

  if (error) {
    if (error.code === "23505") {
      redirect(await peopleUrl(returnQuery, "duplicate-name"));
    }
    throw new Error("Unable to save this people view.");
  }

  revalidatePath("/crm/people");
  redirect(await peopleUrl(returnQuery, "created"));
}

export async function renameSavedViewAction(formData: FormData) {
  const viewId = readString(formData, "viewId");
  const name = validName(readString(formData, "name"));
  const returnQuery = readString(formData, "returnQuery");

  if (!UUID_PATTERN.test(viewId) || !name) {
    redirect(await peopleUrl(returnQuery, "invalid-name"));
  }

  const staff = await requireStaffUser();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("saved_views")
    .update({ name })
    .eq("id", viewId)
    .eq("staff_user_id", staff.staffUserId);

  if (error) {
    if (error.code === "23505") {
      redirect(await peopleUrl(returnQuery, "duplicate-name"));
    }
    throw new Error("Unable to rename this saved view.");
  }

  revalidatePath("/crm/people");
  redirect(await peopleUrl(returnQuery, "renamed"));
}

export async function deleteSavedViewAction(formData: FormData) {
  const viewId = readString(formData, "viewId");
  const returnQuery = readString(formData, "returnQuery");

  if (!UUID_PATTERN.test(viewId)) {
    redirect(await peopleUrl(returnQuery, "invalid-view"));
  }

  const staff = await requireStaffUser();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("saved_views")
    .delete()
    .eq("id", viewId)
    .eq("staff_user_id", staff.staffUserId);

  if (error) {
    throw new Error("Unable to delete this saved view.");
  }

  revalidatePath("/crm/people");
  redirect(await peopleUrl(returnQuery, "deleted"));
}
