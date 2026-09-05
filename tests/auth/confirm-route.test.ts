import { beforeEach, describe, expect, it, vi } from "vitest";

const { establishInvitationSession, establishRecoverySession, cookieSet } = vi.hoisted(() => ({
  establishInvitationSession: vi.fn(),
  establishRecoverySession: vi.fn(),
  cookieSet: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set: cookieSet })),
}));
vi.mock("@/lib/auth/invitation", () => ({ establishInvitationSession }));
vi.mock("@/lib/auth/recovery", () => ({ establishRecoverySession }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({})),
}));
vi.mock("@/lib/env", () => ({
  getServerEnv: vi.fn(() => {
    throw new Error("APP_URL must not be required for callback redirects");
  }),
}));

import { GET } from "@/app/auth/confirm/route";

describe("auth confirmation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    establishInvitationSession.mockResolvedValue({ id: "invited-user" });
    establishRecoverySession.mockResolvedValue({ id: "recovery-user" });
  });

  it("redirects a valid invitation to setup-password on the request origin", async () => {
    const response = await GET(
      new Request("https://staging.example/auth/confirm?token_hash=valid&type=invite"),
    );

    expect(response.headers.get("location")).toBe("https://staging.example/auth/setup-password");
    expect(cookieSet).toHaveBeenCalledWith(
      "invitation_setup",
      "invited-user",
      expect.objectContaining({ secure: true, path: "/auth/setup-password" }),
    );
  });

  it("redirects a valid recovery callback to reset-password on the request origin", async () => {
    const response = await GET(
      new Request("https://staging.example/auth/confirm?token_hash=valid&type=recovery"),
    );

    expect(response.headers.get("location")).toBe("https://staging.example/auth/reset-password");
    expect(cookieSet).toHaveBeenCalledWith(
      "password_recovery",
      "recovery-user",
      expect.objectContaining({ secure: true, path: "/auth/reset-password" }),
    );
  });
});
