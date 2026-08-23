import type { Database, Json } from "@/lib/supabase/database.types";

type EngagementStage = Database["public"]["Enums"]["engagement_stage"];
type TaskPriority = Database["public"]["Enums"]["task_priority"];
type TaskStatus = Database["public"]["Enums"]["task_status"];
type ConsentChannel = Database["public"]["Enums"]["consent_channel"];
type ConsentState = Database["public"]["Enums"]["consent_state"];

type ProfileMappingInput = {
  person: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    zip_code: string | null;
    municipality: string | null;
    engagement_stage: EngagementStage;
    assigned_staff_user_id: string | null;
    do_not_contact: boolean;
    last_activity_at: string | null;
    created_at: string;
  };
  countyName: string | null;
  assignedOrganizerName: string | null;
  relationships: Array<{ name: string }>;
  interests: Array<{ name: string }>;
  tags: Array<{ name: string }>;
  activities: Array<{
    id: string;
    activity_type: string;
    occurred_at: string;
    metadata: Json;
  }>;
  tasks: Array<{
    id: string;
    task_type: string;
    status: TaskStatus;
    priority: TaskPriority;
    due_at: string | null;
    completed_at: string | null;
    created_at: string;
  }>;
  sources: Array<{
    id: string;
    name: string;
    category: string;
    occurred_at: string;
    metadata: Json;
  }>;
  consent: Array<{
    id: string;
    channel: ConsentChannel;
    state: ConsentState;
    effective_at: string;
    sourceName: string | null;
  }>;
  notes: Array<{
    id: string;
    body: string;
    authorName: string;
    created_at: string;
    edited_at: string | null;
  }>;
};

export type PersonProfile = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  location: {
    municipality: string | null;
    countyName: string | null;
    zipCode: string | null;
  };
  engagementStage: EngagementStage;
  assignedStaffUserId: string | null;
  assignedOrganizerName: string | null;
  doNotContact: boolean;
  lastActivityAt: string | null;
  createdAt: string;
  relationships: string[];
  interests: string[];
  tags: string[];
  activities: ProfileMappingInput["activities"];
  tasks: ProfileMappingInput["tasks"];
  sources: ProfileMappingInput["sources"];
  consent: ProfileMappingInput["consent"];
  notes: ProfileMappingInput["notes"];
};

function descendingBy<T>(items: T[], readDate: (item: T) => string) {
  return [...items].sort((a, b) => Date.parse(readDate(b)) - Date.parse(readDate(a)));
}

function sortedNames(items: Array<{ name: string }>) {
  return items.map((item) => item.name).sort((a, b) => a.localeCompare(b));
}

export function mapPersonProfileData(input: ProfileMappingInput): PersonProfile {
  return {
    id: input.person.id,
    name: `${input.person.first_name} ${input.person.last_name}`.trim(),
    firstName: input.person.first_name,
    lastName: input.person.last_name,
    email: input.person.email,
    phone: input.person.phone,
    location: {
      municipality: input.person.municipality,
      countyName: input.countyName,
      zipCode: input.person.zip_code,
    },
    engagementStage: input.person.engagement_stage,
    assignedStaffUserId: input.person.assigned_staff_user_id,
    assignedOrganizerName: input.assignedOrganizerName,
    doNotContact: input.person.do_not_contact,
    lastActivityAt: input.person.last_activity_at,
    createdAt: input.person.created_at,
    relationships: sortedNames(input.relationships),
    interests: sortedNames(input.interests),
    tags: sortedNames(input.tags),
    activities: descendingBy(input.activities, (item) => item.occurred_at),
    tasks: descendingBy(input.tasks, (item) => item.created_at),
    sources: descendingBy(input.sources, (item) => item.occurred_at),
    consent: descendingBy(input.consent, (item) => item.effective_at),
    notes: descendingBy(input.notes, (item) => item.created_at),
  };
}

export async function loadPersonProfile(personId: string): Promise<PersonProfile | null> {
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const personResult = await supabase
    .from("people")
    .select("id, first_name, last_name, email, phone, zip_code, county_id, municipality, engagement_stage, assigned_staff_user_id, do_not_contact, last_activity_at, created_at")
    .eq("id", personId)
    .is("archived_at", null)
    .maybeSingle();

  if (personResult.error) {
    throw new Error("Unable to load supporter profile.");
  }
  if (!personResult.data) {
    return null;
  }

  const person = personResult.data;
  const [relationshipLinks, interestLinks, tagLinks, activitiesResult, tasksResult, personSourcesResult, consentResult, notesResult] =
    await Promise.all([
      supabase.from("person_relationships").select("relationship_type_id").eq("person_id", personId),
      supabase.from("person_interests").select("interest_id").eq("person_id", personId),
      supabase.from("person_tags").select("tag_id").eq("person_id", personId),
      supabase.from("activities").select("id, activity_type, occurred_at, metadata").eq("person_id", personId),
      supabase.from("tasks").select("id, task_type, status, priority, due_at, completed_at, created_at").eq("person_id", personId),
      supabase.from("person_sources").select("id, source_id, occurred_at, metadata").eq("person_id", personId),
      supabase.from("consent_events").select("id, channel, state, effective_at, source_id").eq("person_id", personId),
      supabase.from("internal_notes").select("id, body, author_staff_user_id, created_at, edited_at").eq("person_id", personId),
    ]);

  const firstRound = [
    relationshipLinks,
    interestLinks,
    tagLinks,
    activitiesResult,
    tasksResult,
    personSourcesResult,
    consentResult,
    notesResult,
  ];
  if (firstRound.some((result) => result.error || result.data === null)) {
    throw new Error("Unable to load supporter profile history.");
  }

  const relationshipIds = relationshipLinks.data!.map((row) => row.relationship_type_id);
  const interestIds = interestLinks.data!.map((row) => row.interest_id);
  const tagIds = tagLinks.data!.map((row) => row.tag_id);
  const sourceIds = [...new Set([
    ...personSourcesResult.data!.map((row) => row.source_id),
    ...consentResult.data!.flatMap((row) => row.source_id ? [row.source_id] : []),
  ])];
  const staffIds = [...new Set([
    ...(person.assigned_staff_user_id ? [person.assigned_staff_user_id] : []),
    ...notesResult.data!.map((row) => row.author_staff_user_id),
  ])];

  const [countyResult, relationshipTypesResult, interestsResult, tagsResult, sourcesResult, staffResult] =
    await Promise.all([
      person.county_id
        ? supabase.from("counties").select("id, name").eq("id", person.county_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      relationshipIds.length
        ? supabase.from("relationship_types").select("id, name").in("id", relationshipIds)
        : Promise.resolve({ data: [], error: null }),
      interestIds.length
        ? supabase.from("interests").select("id, name").in("id", interestIds)
        : Promise.resolve({ data: [], error: null }),
      tagIds.length
        ? supabase.from("tags").select("id, name").in("id", tagIds)
        : Promise.resolve({ data: [], error: null }),
      sourceIds.length
        ? supabase.from("sources").select("id, name, category").in("id", sourceIds)
        : Promise.resolve({ data: [], error: null }),
      staffIds.length
        ? supabase.from("staff_users").select("id, display_name").in("id", staffIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  const secondRound = [countyResult, relationshipTypesResult, interestsResult, tagsResult, sourcesResult, staffResult];
  if (secondRound.some((result) => result.error)) {
    throw new Error("Unable to load supporter profile labels.");
  }

  const sourceMap = new Map((sourcesResult.data ?? []).map((row) => [row.id, row]));
  const staffMap = new Map((staffResult.data ?? []).map((row) => [row.id, row.display_name]));

  return mapPersonProfileData({
    person: {
      id: person.id,
      first_name: person.first_name,
      last_name: person.last_name,
      email: person.email,
      phone: person.phone,
      zip_code: person.zip_code,
      municipality: person.municipality,
      engagement_stage: person.engagement_stage,
      assigned_staff_user_id: person.assigned_staff_user_id,
      do_not_contact: person.do_not_contact,
      last_activity_at: person.last_activity_at,
      created_at: person.created_at,
    },
    countyName: countyResult.data?.name ?? null,
    assignedOrganizerName: person.assigned_staff_user_id
      ? staffMap.get(person.assigned_staff_user_id) ?? null
      : null,
    relationships: (relationshipTypesResult.data ?? []).map((row) => ({ name: row.name })),
    interests: (interestsResult.data ?? []).map((row) => ({ name: row.name })),
    tags: (tagsResult.data ?? []).map((row) => ({ name: row.name })),
    activities: activitiesResult.data!,
    tasks: tasksResult.data!,
    sources: personSourcesResult.data!.map((row) => {
      const source = sourceMap.get(row.source_id);
      return {
        id: row.id,
        name: source?.name ?? "Source unavailable",
        category: source?.category ?? "unknown",
        occurred_at: row.occurred_at,
        metadata: row.metadata,
      };
    }),
    consent: consentResult.data!.map((row) => ({
      id: row.id,
      channel: row.channel,
      state: row.state,
      effective_at: row.effective_at,
      sourceName: row.source_id ? sourceMap.get(row.source_id)?.name ?? null : null,
    })),
    notes: notesResult.data!.map((row) => ({
      id: row.id,
      body: row.body,
      authorName: staffMap.get(row.author_staff_user_id) ?? "Staff",
      created_at: row.created_at,
      edited_at: row.edited_at,
    })),
  });
}
