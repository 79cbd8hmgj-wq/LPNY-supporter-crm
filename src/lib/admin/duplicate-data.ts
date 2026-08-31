import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildDuplicateReviewRecord,
  type DuplicateCandidateRecord,
  type DuplicatePersonRecord,
  type DuplicateReviewRecord,
} from "./duplicates";

export async function loadDuplicateReviewData(): Promise<DuplicateReviewRecord[]> {
  const supabase = await createServerSupabaseClient();
  const candidateResult = await supabase
    .from("duplicate_candidates")
    .select("id, person_a_id, person_b_id, reason, confidence, created_at")
    .eq("status", "open")
    .order("confidence", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (candidateResult.error) {
    throw new Error("Unable to load duplicate candidates");
  }

  const rawCandidates = candidateResult.data ?? [];
  if (rawCandidates.length === 0) return [];

  const personIds = [...new Set(rawCandidates.flatMap((candidate) => [candidate.person_a_id, candidate.person_b_id]))];
  const peopleResult = await supabase
    .from("people")
    .select("id, first_name, last_name, email, phone, zip_code, county_id, municipality, engagement_stage, do_not_contact, created_at, last_activity_at")
    .in("id", personIds);

  if (peopleResult.error) {
    throw new Error("Unable to load people for duplicate review");
  }

  const countyIds = [...new Set((peopleResult.data ?? []).map((person) => person.county_id).filter((id): id is string => Boolean(id)))];
  const countyResult = countyIds.length > 0
    ? await supabase.from("counties").select("id, name").in("id", countyIds)
    : { data: [], error: null };

  if (countyResult.error) {
    throw new Error("Unable to load duplicate-review geography");
  }

  const countyNameById = new Map((countyResult.data ?? []).map((county) => [county.id, county.name]));
  const people: DuplicatePersonRecord[] = (peopleResult.data ?? []).map((person) => ({
    id: person.id,
    firstName: person.first_name,
    lastName: person.last_name,
    email: person.email,
    phone: person.phone,
    zipCode: person.zip_code,
    countyName: person.county_id ? countyNameById.get(person.county_id) ?? null : null,
    municipality: person.municipality,
    engagementStage: person.engagement_stage,
    doNotContact: person.do_not_contact,
    createdAt: person.created_at,
    lastActivityAt: person.last_activity_at,
  }));

  return rawCandidates.map((candidate) => {
    const mappedCandidate: DuplicateCandidateRecord = {
      id: candidate.id,
      personAId: candidate.person_a_id,
      personBId: candidate.person_b_id,
      reason: candidate.reason,
      confidence: candidate.confidence,
      createdAt: candidate.created_at,
    };
    return buildDuplicateReviewRecord(mappedCandidate, people);
  });
}
