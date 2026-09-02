"use server";

import { revalidatePath } from "next/cache";
import { requireStaffRole } from "@/lib/auth/require-role";
import {
  duplicateResolutionSchema,
  type DuplicateActionResult,
  type DuplicateResolutionInput,
} from "@/lib/admin/duplicates";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function resolveDuplicateCandidate(
  input: DuplicateResolutionInput,
): Promise<DuplicateActionResult> {
  await requireStaffRole(["admin", "state_organizer"]);
  const parsed = duplicateResolutionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Choose a valid duplicate resolution.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("resolve_duplicate_candidate", {
    p_candidate_id: parsed.data.candidateId,
    p_resolution: parsed.data.resolution,
    p_primary_person_id: parsed.data.primaryPersonId,
  });

  if (result.error) {
    if (result.error.code === "42501") {
      return { status: "error", message: "Your account does not have permission to resolve duplicate supporters." };
    }
    if (result.error.code === "22023") {
      return { status: "error", message: "This duplicate candidate changed or is no longer available for that resolution. Refresh and review it again." };
    }
    return { status: "error", message: "Unable to resolve this duplicate candidate right now." };
  }

  revalidatePath("/crm/admin/duplicates");
  revalidatePath("/crm/people");
  if (parsed.data.resolution === "merge" && parsed.data.primaryPersonId) {
    revalidatePath(`/crm/people/${parsed.data.primaryPersonId}`);
  }

  return {
    status: "success",
    message: parsed.data.resolution === "merge"
      ? "Supporter records merged. The non-canonical record was archived and its history was preserved."
      : "Supporters marked as separate records.",
  };
}
