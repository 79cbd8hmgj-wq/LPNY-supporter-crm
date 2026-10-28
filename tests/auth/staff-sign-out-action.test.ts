import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerSupabaseClient, signOut, redirect, revalidatePath } = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  signOut: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { staffSignOutAction } from "@/app/crm/sign-out-action";

describe("staff sign-out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createServerSupabaseClient.mockResolvedValue({ auth: { signOut } });
    signOut.mockResolvedValue({ error: null });
    redirect.mockImplementation((path: string) => { throw new Error(`redirect:${path}`); });
  });

  it("signs out only the current session, invalidates CRM cache, and redirects to staff login", async () => {
    await expect(staffSignOutAction(null, new FormData())).rejects.toThrow("redirect:/login");
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(revalidatePath).toHaveBeenCalledWith("/crm", "layout");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("displays a retryable error and does not redirect if Supabase rejects sign-out", async () => {
    signOut.mockResolvedValue({ error: { message: "private auth detail" } });
    await expect(staffSignOutAction(null, new FormData())).resolves.toEqual({
      error: "Unable to sign out. Please try again.",
    });
    expect(redirect).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("does not falsely report a successful sign-out on a service exception", async () => {
    createServerSupabaseClient.mockRejectedValue(new Error("private config detail"));
    await expect(staffSignOutAction(null, new FormData())).resolves.toEqual({
      error: "Unable to sign out. Please try again.",
    });
    expect(redirect).not.toHaveBeenCalled();
  });
});
