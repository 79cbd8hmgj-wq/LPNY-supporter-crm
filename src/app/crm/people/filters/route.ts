import { NextResponse } from "next/server";
import { requireStaffUser } from "@/lib/auth/require-staff";
import {
  normalizePeopleSearchQuery,
  parsePeopleFilters,
  serializePeopleFilters,
} from "@/lib/crm/people-filters";
import { writePeopleSearchQueryToResponse } from "@/lib/crm/people-search-state";

const PEOPLE_FILTER_FORM_KEYS = [
  "county",
  "zip",
  "stage",
  "relationship",
  "interest",
  "tag",
  "organizer",
  "source",
  "joinedAfter",
  "joinedBefore",
  "inactiveDays",
  "openTask",
  "candidateInterest",
  "memberStatus",
] as const;

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  await requireStaffUser();
  const formData = await request.formData();
  const clear = readString(formData, "intent") === "clear";
  const params = new URLSearchParams();

  if (!clear) {
    for (const key of PEOPLE_FILTER_FORM_KEYS) {
      const value = readString(formData, key);
      if (value) params.set(key, value);
    }
  }

  const filters = parsePeopleFilters(params);
  const query = clear ? "" : normalizePeopleSearchQuery(readString(formData, "q"));
  const target = serializePeopleFilters({ ...filters, query, page: 1 }).toString();
  const response = NextResponse.redirect(
    new URL(target ? `/crm/people?${target}` : "/crm/people", request.url),
    { status: 303 },
  );
  writePeopleSearchQueryToResponse(response, query);
  return response;
}
