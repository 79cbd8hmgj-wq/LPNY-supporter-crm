import { beforeEach, describe, expect, it, vi } from "vitest";

const { resetPasswordForEmail, getUser, updateUser, cookieGet, cookieSet, redirect } = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
  redirect: vi.fn((to: string) => { throw new Error(`REDIRECT:${to}`); }),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: cookieGet, set: cookieSet })) }));
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({ APP_URL: "https://staff.lpny.example", SUPABASE_SERVICE_ROLE_KEY: "test" }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { resetPasswordForEmail, getUser, updateUser },
  })),
}));

import {
  forgotPasswordInitialState,
  requestPasswordRecoveryAction,
} from "@/app/auth/forgot-password/actions";
import { resetPasswordAction } from "@/app/auth/reset-password/actions";
import { establishRecoverySession } from "@/lib/auth/recovery";

function recoveryRequest(email: string) {
  const data = new FormData();
  data.set("email", email);
  return data;
}

function newPassword(password: string, confirmation = password) {
  const data = new FormData();
  data.set("password", password);
  data.set("confirmPassword", confirmation);
  return data;
}

describe("password recovery request", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([null, { message: "User not found" }])("returns the same generic response regardless of account existence", async (error) => {
    resetPasswordForEmail.mockResolvedValue({ data: {}, error });
    const result = await requestPasswordRecoveryAction(forgotPasswordInitialState, recoveryRequest("staff@example.org"));

    expect(result).toEqual({
      status: "success",
      message: "If an account exists for that email, a password recovery link has been sent.",
    });
    expect(resetPasswordForEmail).toHaveBeenCalledWith("staff@example.org", {
      redirectTo: "https://staff.lpny.example/auth/confirm?type=recovery",
    });
  });

  it("rejects an invalid email without calling Supabase", async () => {
    const result = await requestPasswordRecoveryAction(forgotPasswordInitialState, recoveryRequest("not-an-email"));
    expect(result).toEqual({ status: "error", message: "Enter a valid email address." });
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe("recovery callback", () => {
  it("establishes a session from a valid recovery token", async () => {
    const client = {
      auth: {
        verifyOtp: vi.fn().mockResolvedValue({ error: null }),
        exchangeCodeForSession: vi.fn(),
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
    };
    await expect(establishRecoverySession(
      client,
      new URL("https://staff.lpny.example/auth/confirm?token_hash=valid&type=recovery"),
    )).resolves.toEqual({ id: "user-1" });
    expect(client.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "valid", type: "recovery" });
  });

  it.each([
    "https://staff.lpny.example/auth/confirm?type=recovery",
    "https://staff.lpny.example/auth/confirm?token_hash=used&type=recovery",
  ])("safely rejects a malformed, expired, or already-used link", async (url) => {
    const client = {
      auth: {
        verifyOtp: vi.fn().mockResolvedValue({ error: new Error("expired or already used") }),
        exchangeCodeForSession: vi.fn(),
        getUser: vi.fn(),
      },
    };
    await expect(establishRecoverySession(client, new URL(url))).resolves.toBeNull();
  });
});

describe("password recovery completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    cookieGet.mockReturnValue({ value: "user-1" });
    updateUser.mockResolvedValue({ data: {}, error: null });
  });

  it("requires matching passwords", async () => {
    await expect(resetPasswordAction(null, newPassword("Valid-password-42!", "Different-password-42!")))
      .resolves.toEqual({ error: "Passwords do not match." });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("updates the password and routes through MFA instead of the CRM", async () => {
    await expect(resetPasswordAction(null, newPassword("Valid-password-42!"))).rejects.toThrow("REDIRECT:/mfa");
    expect(updateUser).toHaveBeenCalledWith({ password: "Valid-password-42!" });
    expect(cookieSet).toHaveBeenCalledWith("password_recovery", "", {
      maxAge: 0,
      path: "/auth/reset-password",
    });
    expect(redirect).toHaveBeenCalledWith("/mfa");
    expect(redirect).not.toHaveBeenCalledWith("/crm");
  });
});
