import { NextResponse } from "next/server";
import { requireStaffUser } from "@/lib/auth/require-staff";
import { serializePeopleFilters } from "@/lib/crm/people-filters";
import { writePeopleSearchQueryToResponse } from "@/lib/crm/people-search-state";
import { decodeSavedViewFilters } from "@/lib/crm/saved-views";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function redirectToPeople(request: Request, target: string) {
  return NextResponse.redirect(new URL(target, request.url), { status: 303 });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  const formData = await request.formData();
  const viewId = readString(formData, "viewId");
  if (!UUID_PATTERN.test(viewId)) {
    return redirectToPeople(request, "/crm/people?savedViewStatus=invalid-view");
  }

  const staff = await requireStaffUser();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("saved_views")
    .select("filters")
    .eq("id", viewId)
    .eq("staff_user_id", staff.staffUserId)
    .maybeSingle();

  const filters = !error && data ? decodeSavedViewFilters(data.filters) : null;
  if (!filters) {
    return redirectToPeople(request, "/crm/people?savedViewStatus=invalid-view");
  }

  const target = serializePeopleFilters({ ...filters, page: 1 }).toString();
  const response = redirectToPeople(
    request,
    target ? `/crm/people?${target}` : "/crm/people",
  );
  writePeopleSearchQueryToResponse(response, filters.query);
  return response;
}
