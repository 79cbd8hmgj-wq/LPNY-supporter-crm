"use server";

import { revalidatePath } from "next/cache";
import { requireStaffRole } from "@/lib/auth/require-role";
import {
  staffAccessUpdateSchema,
  staffInviteSchema,
  staffTemporaryPasswordSchema,
  type StaffAccessUpdateInput,
  type StaffActionResult,
  type StaffInviteInput,
  type StaffTemporaryPasswordInput,
} from "@/lib/admin/staff";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStaffInvitationErrorMessage } from "@/lib/admin/staff-invitation-error";
import { getServerEnv } from "@/lib/env";

export async function inviteStaffMember(input: StaffInviteInput): Promise<StaffActionResult> {
  await requireStaffRole(["admin"]);
  const parsed = staffInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Enter valid staff invitation details." };
  }

  const admin = createAdminSupabaseClient();
  const invitation = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { display_name: parsed.data.displayName },
    redirectTo: new URL("/auth/confirm", getServerEnv().APP_URL).toString(),
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

function exceptionName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

export async function setStaffTemporaryPassword(
  input: StaffTemporaryPasswordInput,
): Promise<StaffActionResult> {
  const actor = await requireStaffRole(["admin"]);
  const parsed = staffTemporaryPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter a valid temporary password.",
    };
  }

  let admin: ReturnType<typeof createAdminSupabaseClient>;
  try {
    admin = createAdminSupabaseClient();
  } catch (error) {
    console.error("Staff temporary password admin client initialization failed", {
      errorName: exceptionName(error),
    });
    return {
      status: "error",
      message: "Password service configuration is unavailable. Reference: TPW-CONFIG.",
    };
  }

  let target;
  try {
    target = await admin
      .from("staff_users")
      .select("id, auth_user_id, status")
      .eq("id", parsed.data.staffUserId)
      .maybeSingle();
  } catch (error) {
    console.error("Staff temporary password staff lookup threw", {
      errorName: exceptionName(error),
    });
    return {
      status: "error",
      message: "Unable to load this staff account for password recovery. Reference: TPW-LOOKUP-EXCEPTION.",
    };
  }

  if (target.error) {
    console.error("Staff temporary password staff lookup failed", {
      code: target.error.code,
    });
    return {
      status: "error",
      message: "Unable to load this staff account for password recovery. Reference: TPW-LOOKUP.",
    };
  }

  if (!target.data?.auth_user_id) {
    return {
      status: "error",
      message: "This staff record is not linked to a Supabase Auth account. Reference: TPW-NO-AUTH-LINK.",
    };
  }

  if (target.data.status !== "active") {
    return { status: "error", message: "Reactivate this staff account before setting a temporary password." };
  }

  let passwordUpdate;
  try {
    passwordUpdate = await admin.auth.admin.updateUserById(target.data.auth_user_id, {
      password: parsed.data.password,
    });
  } catch (error) {
    console.error("Supabase staff temporary password update threw before a response", {
      errorName: exceptionName(error),
    });
    return {
      status: "error",
      message: "The password request failed before Supabase Auth returned a response. Reference: TPW-AUTH-EXCEPTION.",
    };
  }

  if (passwordUpdate.error) {
    console.error("Supabase staff temporary password update failed", {
      code: passwordUpdate.error.code,
      status: passwordUpdate.error.status,
    });
    const status = passwordUpdate.error.status ? ` HTTP ${passwordUpdate.error.status}.` : "";
    const code = passwordUpdate.error.code ? ` Code: ${passwordUpdate.error.code}.` : "";
    return {
      status: "error",
      message: `Supabase Auth rejected the password change.${status}${code} Reference: TPW-AUTH.`,
    };
  }

  let audit;
  try {
    audit = await admin.from("admin_audit_events").insert({
      actor_staff_user_id: actor.staffUserId,
      action_type: "staff_temporary_password_set",
      target_type: "staff_user",
      target_id: target.data.id,
      metadata: {},
    });
  } catch (error) {
    console.error("Staff temporary password audit insert threw", {
      errorName: exceptionName(error),
    });
    return {
      status: "error",
      message: "The password was changed, but the audit event could not be recorded. Reference: TPW-AUDIT-EXCEPTION. Do not repeat the reset.",
    };
  }

  if (audit.error) {
    console.error("Staff temporary password audit failed", { code: audit.error.code });
    return {
      status: "error",
      message: "The password was changed, but the audit event could not be recorded. Reference: TPW-AUDIT. Do not repeat the reset.",
    };
  }

  return {
    status: "success",
    message: "Temporary password set. Share it privately; it remains valid until the staff member changes it.",
  };
}
