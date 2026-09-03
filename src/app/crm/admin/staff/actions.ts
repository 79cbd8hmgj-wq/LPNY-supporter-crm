"use server";

import { revalidatePath } from "next/cache";
import { requireStaffRole } from "@/lib/auth/require-role";
import {
  staffAccessUpdateSchema,
  staffInviteSchema,
  type StaffAccessUpdateInput,
  type StaffActionResult,
  type StaffInviteInput,
} from "@/lib/admin/staff";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStaffInvitationErrorMessage } from "@/lib/admin/staff-invitation-error";

export async function inviteStaffMember(input: StaffInviteInput): Promise<StaffActionResult> {
  await requireStaffRole(["admin"]);
  const parsed = staffInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Enter valid staff invitation details." };
  }

  const admin = createAdminSupabaseClient();
  const invitation = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { display_name: parsed.data.displayName },
  });

  if (invitation.error || !invitation.data.user) {
    console.error("Supabase staff invitation failed", {
      code: invitation.error?.code,
      message: invitation.error?.message,
      status: invitation.error?.status,
    });
    return {
      status: "error",
      message: getStaffInvitationErrorMessage(invitation.error),
    };
  }

  const supabase = await createServerSupabaseClient();
  const registration = await supabase.rpc("admin_register_staff_user", {
    p_auth_user_id: invitation.data.user.id,
    p_display_name: parsed.data.displayName,
    p_role: parsed.data.role,
    p_county_ids: parsed.data.countyIds,
  });

  if (registration.error) {
    const cleanup = await admin.auth.admin.deleteUser(invitation.data.user.id);
    return cleanup.error
      ? {
          status: "error",
          message: "The invitation could not be registered and its Auth account could not be cleaned up automatically. Review Supabase Auth before retrying.",
        }
      : {
          status: "error",
          message: "The invitation could not be registered in the CRM. The temporary Auth account was removed; you can retry safely.",
        };
  }

  revalidatePath("/crm/admin/staff");
  return { status: "success", message: `Invitation sent to ${parsed.data.email}.` };
}

export async function updateStaffAccess(input: StaffAccessUpdateInput): Promise<StaffActionResult> {
  await requireStaffRole(["admin"]);
  const parsed = staffAccessUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Enter valid staff access settings." };
  }

  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("admin_update_staff_access", {
    p_staff_user_id: parsed.data.staffUserId,
    p_role: parsed.data.role,
    p_status: parsed.data.status,
    p_county_ids: parsed.data.countyIds,
  });

  if (result.error) {
    if (result.error.code === "42501") {
      return { status: "error", message: "Your account does not have permission to manage staff access." };
    }
    return { status: "error", message: "Unable to update this staff account right now." };
  }

  revalidatePath("/crm/admin/staff");
  return { status: "success", message: "Staff access updated." };
}
