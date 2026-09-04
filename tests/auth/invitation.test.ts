import { describe, expect, it, vi } from "vitest";
import { establishInvitationSession, invitationPasswordSchema, parseInvitationCallback } from "@/lib/auth/invitation";

function client(overrides: { verifyError?: unknown; codeError?: unknown; invitedAt?: string } = {}) {
  return {
    auth: {
      verifyOtp: vi.fn().mockResolvedValue({ error: overrides.verifyError ?? null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: overrides.codeError ?? null }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "invited-user", invited_at: overrides.invitedAt ?? "2026-09-04T00:00:00Z" } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

describe("invitation callback", () => {
  it("rejects callbacks without an invitation token or authorization code", async () => {
    const auth = client();
    expect(parseInvitationCallback(new URL("https://crm.example/auth/confirm")).success).toBe(false);
    expect(await establishInvitationSession(auth, new URL("https://crm.example/auth/confirm"))).toBeNull();
    expect(auth.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("rejects an invalid or expired invitation token", async () => {
    const auth = client({ verifyError: new Error("Token has expired") });
    const result = await establishInvitationSession(
      auth,
      new URL("https://crm.example/auth/confirm?token_hash=expired&type=invite"),
    );
    expect(result).toBeNull();
    expect(auth.auth.getUser).not.toHaveBeenCalled();
  });

  it("rejects a valid session that did not originate from an invitation", async () => {
    const auth = client({ invitedAt: "" });
    expect(await establishInvitationSession(auth, new URL("https://crm.example/auth/confirm?code=oauth-code"))).toBeNull();
    expect(auth.auth.signOut).toHaveBeenCalledOnce();
  });
});

describe("invitation password policy", () => {
  it.each(["Short1!", "alllowercase1!", "ALLUPPERCASE1!", "NoNumbersHere!", "NoSymbolsHere1"])(
    "rejects %s",
    (password) => expect(invitationPasswordSchema.safeParse(password).success).toBe(false),
  );

  it("accepts a policy-compliant password", () => {
    expect(invitationPasswordSchema.safeParse("A-secure-staff-password-42!").success).toBe(true);
  });
});
