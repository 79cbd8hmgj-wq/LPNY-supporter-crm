import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireStaffRole,
  from,
  staffMaybeSingle,
  auditInsert,
  updateUserById,
  rpc,
  revalidatePath,
} = vi.hoisted(() => ({
  requireStaffRole: vi.fn(),
  from: vi.fn(),
  staffMaybeSingle: vi.fn(),
  auditInsert: vi.fn(),
  updateUserById: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/auth/require-role", () => ({ requireStaffRole }));
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({ APP_URL: "https://staff.lpny.example", SUPABASE_SERVICE_ROLE_KEY: "test" }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ rpc })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    auth: {
      admin: {
        updateUserById,
        inviteUserByEmail: vi.fn(),
        deleteUser: vi.fn(),
      },
    },
    from,
  }),
}));

import { setStaffTemporaryPassword } from "@/app/crm/admin/staff/actions";

const staffUserId = "33333333-3333-4333-8333-333333333333";
const authUserId = "44444444-4444-4444-8444-444444444444";
const actorStaffUserId = "55555555-5555-4555-8555-555555555555";
const password = "Temporary-access-42!";

function validInput() {
  return {
    staffUserId,
    password,
    confirmPassword: password,
  };
}

describe("admin temporary staff password action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireStaffRole.mockResolvedValue({
      staffUserId: actorStaffUserId,
      authUserId: "66666666-6666-4666-8666-666666666666",
      displayName: "Admin",
      role: "admin",
      aal: "aal2",
    });
    staffMaybeSingle.mockResolvedValue({
      data: { id: staffUserId, auth_user_id: authUserId, status: "active" },
      error: null,
    });
    updateUserById.mockResolvedValue({ data: { user: { id: authUserId } }, error: null });
    auditInsert.mockResolvedValue({ error: null });

    from.mockImplementation((table: string) => {
      if (table === "staff_users") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: staffMaybeSingle,
            }),
          }),
        };
      }
      if (table === "admin_audit_events") {
        return { insert: auditInsert };
      }
      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it("sets the Auth password and appends a password-free audit event", async () => {
    const result = await setStaffTemporaryPassword(validInput());

    expect(result.status).toBe("success");
    expect(requireStaffRole).toHaveBeenCalledWith(["admin"]);
    expect(updateUserById).toHaveBeenCalledWith(authUserId, { password });
    expect(auditInsert).toHaveBeenCalledWith({
      actor_staff_user_id: actorStaffUserId,
      action_type: "staff_temporary_password_set",
      target_type: "staff_user",
      target_id: staffUserId,
      metadata: {},
    });
    expect(JSON.stringify(auditInsert.mock.calls)).not.toContain(password);
  });

  it("refuses to set a password for a disabled staff record", async () => {
    staffMaybeSingle.mockResolvedValue({
      data: { id: staffUserId, auth_user_id: authUserId, status: "disabled" },
      error: null,
    });

    const result = await setStaffTemporaryPassword(validInput());

    expect(result).toEqual({
      status: "error",
      message: "Reactivate this staff account before setting a temporary password.",
    });
    expect(updateUserById).not.toHaveBeenCalled();
    expect(auditInsert).not.toHaveBeenCalled();
  });

  it("does not expose Supabase Auth error details", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    updateUserById.mockResolvedValue({
      data: { user: null },
      error: { code: "unexpected_auth_failure", status: 500, message: "sensitive backend detail" },
    });

    const result = await setStaffTemporaryPassword(validInput());

    expect(result).toEqual({ status: "error", message: "Unable to change this staff password right now." });
    expect(JSON.stringify(result)).not.toContain("sensitive backend detail");
    expect(auditInsert).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Supabase staff temporary password update failed",
      { code: "unexpected_auth_failure", status: 500 },
    );
    consoleError.mockRestore();
  });

  it("reports when the password changed but audit recording failed", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    auditInsert.mockResolvedValue({ error: { code: "XX999", message: "database detail" } });

    const result = await setStaffTemporaryPassword(validInput());

    expect(result.status).toBe("error");
    expect(result.message).toMatch(/password was changed/i);
    expect(result.message).not.toContain(password);
    expect(result.message).not.toContain("database detail");
    expect(consoleError).toHaveBeenCalledWith(
      "Staff temporary password audit failed",
      { code: "XX999" },
    );
    consoleError.mockRestore();
  });
});
