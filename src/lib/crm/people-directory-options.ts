type Option = { value: string; label: string };

export type PeopleDirectoryOptions = {
  counties: Option[];
  relationships: Option[];
  interests: Option[];
  tags: Option[];
  organizers: Option[];
  sources: Option[];
};

function assertRows<T>(data: T[] | null, error: { message: string } | null, label: string): T[] {
  if (error || data === null) {
    throw new Error(`Unable to load ${label}.`);
  }

  return data;
}

export async function loadPeopleDirectoryOptions(): Promise<PeopleDirectoryOptions> {
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();

  const [countiesResult, relationshipsResult, interestsResult, tagsResult, staffResult, sourcesResult] =
    await Promise.all([
      supabase.from("counties").select("id, name").order("name"),
      supabase.from("relationship_types").select("slug, name").eq("active", true).order("name"),
      supabase.from("interests").select("slug, name").eq("active", true).order("name"),
      supabase.from("tags").select("id, name").eq("active", true).order("name"),
      supabase.from("staff_users").select("id, display_name").eq("status", "active").order("display_name"),
      supabase.from("sources").select("slug, name").eq("active", true).order("name"),
    ]);

  const counties = assertRows(countiesResult.data, countiesResult.error, "county filters");
  const relationships = assertRows(relationshipsResult.data, relationshipsResult.error, "relationship filters");
  const interests = assertRows(interestsResult.data, interestsResult.error, "interest filters");
  const tags = assertRows(tagsResult.data, tagsResult.error, "tag filters");
  const staff = assertRows(staffResult.data, staffResult.error, "organizer filters");
  const sources = assertRows(sourcesResult.data, sourcesResult.error, "source filters");

  return {
    counties: counties.map((county) => ({ value: county.id, label: county.name })),
    relationships: relationships.map((relationship) => ({ value: relationship.slug, label: relationship.name })),
    interests: interests.map((interest) => ({ value: interest.slug, label: interest.name })),
    tags: tags.map((tag) => ({ value: tag.id, label: tag.name })),
    organizers: staff.map((organizer) => ({ value: organizer.id, label: organizer.display_name })),
    sources: sources.map((source) => ({ value: source.slug, label: source.name })),
  };
}
