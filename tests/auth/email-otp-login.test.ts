import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithOtp, verifyOtp, redirect, createServerSupabaseClient } = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  redirect: vi.fn((url: string) => { throw new Error("REDIRECT:" + url); }),
  createServerSupabaseClient: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

import { requestStaffEmailCode, verifyStaffEmailCode } from "@/app/login/actions";

function fields(email: string, token?: string) {
  const form = new FormData();
  form.set("email", email);
  if (token !== undefined) form.set("token", token);
  return form;
}

describe("staff email OTP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createServerSupabaseClient.mockResolvedValue({ auth: { signInWithOtp, verifyOtp } });
    signInWithOtp.mockResolvedValue({ error: null });
    verifyOtp.mockResolvedValue({ data: { user: { id: "test" } }, error: null });
  });

  it("requests email code for existing users only, never self-registering", async () => {
    const result = await requestStaffEmailCode({ status: "idle", message: "" }, fields("STAFF@EXAMPLE.ORG"));
    expect(result.status).toBe("sent");
    expect(signInWithOtp).toHaveBeenCalledWith({ email: "staff@example.org", options: { shouldCreateUser: false } });
  });

  it("returns a controlled error when Supabase fails rather than a server exception", async () => {
    signInWithOtp.mockRejectedValue(new Error("private backend detail"));
    const result = await requestStaffEmailCode({ status: "idle", message: "" }, fields("staff@example.org"));
    expect(result.status).toBe("error");
    expect(JSON.stringify(result)).not.toContain("private backend detail");
  });

  it("requires a six digit token and verifies email OTP before MFA, not CRM", async () => {
    expect(await verifyStaffEmailCode({ status: "idle", message: "" }, fields("staff@example.org", "12345"))).toEqual({
      status: "error", message: "Enter the six-digit code from your email.",
    });
    expect(verifyOtp).not.toHaveBeenCalled();
    await expect(verifyStaffEmailCode({ status: "idle", message: "" }, fields("staff@example.org", "123456")))
      .rejects.toThrow("REDIRECT:/mfa");
    expect(verifyOtp).toHaveBeenCalledWith({ email: "staff@example.org", token: "123456", type: "email" });
    expect(redirect).not.toHaveBeenCalledWith("/crm");
  });

  it("rejects invalid OTP without bypassing MFA", async () => {
    verifyOtp.mockResolvedValue({ error: { message: "invalid" } });
    const result = await verifyStaffEmailCode({ status: "idle", message: "" }, fields("staff@example.org", "999999"));
    expect(result.status).toBe("error");
    expect(redirect).not.toHaveBeenCalled();
  });
});
