import type { Json } from "@/lib/supabase/database.types";
import {
  normalizePeopleSearchQuery,
  parsePeopleFilters,
  serializePeopleFilters,
  type PeopleFilterState,
} from "./people-filters";

export type SavedPeopleView = {
  id: string;
  name: string;
  filters: Json;
  updatedAt: string;
};

export function encodeSavedViewFilters(filters: PeopleFilterState): Json {
  const params = serializePeopleFilters({ ...filters, query: "", page: 1 });
  return {
    ...Object.fromEntries(params.entries()),
    ...(filters.query ? { q: normalizePeopleSearchQuery(filters.query) } : {}),
  };
}

export function decodeSavedViewFilters(value: Json): PeopleFilterState | null {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    return null;
  }

  const params = new URLSearchParams();

  for (const [key, candidate] of Object.entries(value)) {
    if (key !== "q" && typeof candidate === "string") {
      params.set(key, candidate);
    }
  }

  const query = typeof value.q === "string" ? normalizePeopleSearchQuery(value.q) : "";
  return { ...parsePeopleFilters(params), query, page: 1 };
}

export async function loadSavedPeopleViews(): Promise<SavedPeopleView[]> {
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("saved_views")
    .select("id, name, filters, updated_at")
    .order("updated_at", { ascending: false });

  if (error || data === null) {
    throw new Error("Unable to load saved views.");
  }

  return data.map((view) => ({
    id: view.id,
    name: view.name,
    filters: view.filters,
    updatedAt: view.updated_at,
  }));
}
