import "server-only";

import { cookies } from "next/headers";
import { normalizePeopleSearchQuery } from "@/lib/crm/people-filters";

const PEOPLE_SEARCH_COOKIE = "lpny_people_search";
const PEOPLE_SEARCH_MAX_AGE_SECONDS = 60 * 60;

function encodeQuery(query: string) {
  return Buffer.from(query, "utf8").toString("base64url");
}

function decodeQuery(value: string) {
  try {
    return normalizePeopleSearchQuery(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return "";
  }
}

export async function readPeopleSearchQuery(active: boolean) {
  if (!active) return "";
  const store = await cookies();
  const value = store.get(PEOPLE_SEARCH_COOKIE)?.value;
  return value ? decodeQuery(value) : "";
}

export async function writePeopleSearchQuery(rawQuery: string) {
  const query = normalizePeopleSearchQuery(rawQuery);
  const store = await cookies();

  if (!query) {
    store.delete(PEOPLE_SEARCH_COOKIE);
    return "";
  }

  store.set(PEOPLE_SEARCH_COOKIE, encodeQuery(query), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/crm",
    maxAge: PEOPLE_SEARCH_MAX_AGE_SECONDS,
  });

  return query;
}

export async function clearPeopleSearchQuery() {
  const store = await cookies();
  store.delete(PEOPLE_SEARCH_COOKIE);
}
