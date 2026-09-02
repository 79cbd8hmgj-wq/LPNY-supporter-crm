import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  StaffCountyOption,
  StaffManagementRecord,
} from "./staff";

export async function loadStaffAdministrationData(): Promise<{
  staff: StaffManagementRecord[];
  counties: StaffCountyOption[];
}> {
  const supabase = await createServerSupabaseClient();
  const [staffResult, countyResult, assignmentResult] = await Promise.all([
    supabase
      .from("staff_users")
      .select("id, display_name, role, status, invited_at")
      .order("display_name", { ascending: true }),
    supabase
      .from("counties")
      .select("id, name")
      .order("name", { ascending: true }),
    supabase
      .from("staff_counties")
      .select("staff_user_id, county_id"),
  ]);

  if (staffResult.error || countyResult.error || assignmentResult.error) {
    throw new Error("Unable to load staff administration data");
  }

  const countyIdsByStaff = new Map<string, string[]>();
  for (const assignment of assignmentResult.data ?? []) {
    const existing = countyIdsByStaff.get(assignment.staff_user_id) ?? [];
    existing.push(assignment.county_id);
    countyIdsByStaff.set(assignment.staff_user_id, existing);
  }

  return {
    staff: (staffResult.data ?? []).map((record) => ({
      id: record.id,
      displayName: record.display_name,
      role: record.role,
      status: record.status,
      invitedAt: record.invited_at,
      countyIds: countyIdsByStaff.get(record.id) ?? [],
    })),
    counties: (countyResult.data ?? []).map((county) => ({
      id: county.id,
      name: county.name,
    })),
  };
}
