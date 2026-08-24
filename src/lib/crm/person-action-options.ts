import type { StaffRole } from "@/lib/auth/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ToggleOption = {
  id: string;
  slug: string;
  name: string;
  enabled: boolean;
};

export type TagToggleOption = {
  id: string;
  name: string;
  enabled: boolean;
};

export type OrganizerOption = {
  id: string;
  name: string;
  role: StaffRole;
};

export type PersonActionOptions = {
  relationships: ToggleOption[];
  interests: ToggleOption[];
  tags: TagToggleOption[];
  organizers: OrganizerOption[];
};

export async function loadPersonActionOptions(
  personId: string,
  role: StaffRole,
): Promise<PersonActionOptions> {
  const supabase = await createServerSupabaseClient();
  const [personResult, relationshipsResult, interestsResult, tagsResult, relationshipLinks, interestLinks, tagLinks] =
    await Promise.all([
      supabase.from("people").select("county_id").eq("id", personId).maybeSingle(),
      supabase.from("relationship_types").select("id, slug, name").eq("active", true).order("name"),
      supabase.from("interests").select("id, slug, name").eq("active", true).order("name"),
      supabase.from("tags").select("id, name").eq("active", true).order("name"),
      supabase.from("person_relationships").select("relationship_type_id").eq("person_id", personId),
      supabase.from("person_interests").select("interest_id").eq("person_id", personId),
      supabase.from("person_tags").select("tag_id").eq("person_id", personId),
    ]);

  const results = [
    personResult,
    relationshipsResult,
    interestsResult,
    tagsResult,
    relationshipLinks,
    interestLinks,
    tagLinks,
  ];
  if (results.some((result) => result.error)) {
    throw new Error("Unable to load supporter action options.");
  }

  const relationshipIds = new Set((relationshipLinks.data ?? []).map((row) => row.relationship_type_id));
  const interestIds = new Set((interestLinks.data ?? []).map((row) => row.interest_id));
  const tagIds = new Set((tagLinks.data ?? []).map((row) => row.tag_id));

  let organizers: OrganizerOption[] = [];
  if (role === "admin" || role === "state_organizer") {
    const staffResult = await supabase
      .from("staff_users")
      .select("id, display_name, role")
      .eq("status", "active")
      .in("role", ["admin", "state_organizer", "county_organizer"])
      .order("display_name");

    if (staffResult.error) {
      throw new Error("Unable to load organizer assignments.");
    }

    let countyOrganizerIds = new Set<string>();
    const countyId = personResult.data?.county_id ?? null;
    if (countyId) {
      const countyAssignments = await supabase
        .from("staff_counties")
        .select("staff_user_id")
        .eq("county_id", countyId);
      if (countyAssignments.error) {
        throw new Error("Unable to load organizer assignments.");
      }
      countyOrganizerIds = new Set((countyAssignments.data ?? []).map((row) => row.staff_user_id));
    }

    organizers = (staffResult.data ?? [])
      .filter((staff) => staff.role !== "county_organizer" || countyOrganizerIds.has(staff.id))
      .map((staff) => ({ id: staff.id, name: staff.display_name, role: staff.role }));
  }

  return {
    relationships: (relationshipsResult.data ?? []).map((item) => ({
      ...item,
      enabled: relationshipIds.has(item.id),
    })),
    interests: (interestsResult.data ?? []).map((item) => ({
      ...item,
      enabled: interestIds.has(item.id),
    })),
    tags: (tagsResult.data ?? []).map((item) => ({
      ...item,
      enabled: tagIds.has(item.id),
    })),
    organizers,
  };
}
