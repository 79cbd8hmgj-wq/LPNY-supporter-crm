import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithOAuth } = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({
    auth: { signInWithOAuth },
  }),
}));

vi.mock("@/app/supporter/sign-in/actions", () => ({
  requestSupporterSignInAction: vi.fn(),
}));

import { SupporterSignInForm } from "@/app/supporter/sign-in/supporter-sign-in-form";

describe("SupporterSignInForm Google OAuth", () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
    signInWithOAuth.mockResolvedValue({ error: null });
  });

  it("starts Google OAuth and keeps email sign-in available as a fallback", async () => {
    render(<SupporterSignInForm />);

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: "http://localhost:3000/supporter/auth/confirm",
        },
      });
    });
  });
});
