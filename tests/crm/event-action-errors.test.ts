import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireStaffUser, rpc, revalidatePath } = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/auth/require-staff", () => ({ requireStaffUser }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ rpc })),
}));

import { createEventAction } from "@/app/crm/work/actions";

const DATABASE_DETAIL = "relation crm_events_secret does not exist";
const DESCRIPTION = "Call Jamie about their private accessibility needs";

function eventForm() {
  const formData = new FormData();
  formData.set("title", "County organizing meeting");
  formData.set("description", DESCRIPTION);
  formData.set("location", "Private residence");
  formData.set("startsAt", "2026-09-10T18:00");
  formData.set("endsAt", "2026-09-10T19:00");
  return formData;
}

describe("createEventAction RPC errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireStaffUser.mockResolvedValue({ staffUserId: "staff-safe-id" });
  });

  it("tells the organizer to correct details rejected by database validation", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "22023", message: DATABASE_DETAIL } });

    const result = await createEventAction({ status: "error", message: "" }, eventForm());

    expect(result.status).toBe("error");
    expect(result.message).toMatch(/correct|submit.*again/i);
    expect(result.message).not.toContain(DATABASE_DETAIL);
    expect(result.message).not.toContain(DESCRIPTION);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("tells an organizer with an unauthorized session to sign in again", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "42501", message: DATABASE_DETAIL } });

    const result = await createEventAction({ status: "error", message: "" }, eventForm());

    expect(result.status).toBe("error");
    expect(result.message).toMatch(/sign in again/i);
    expect(result.message).not.toContain(DATABASE_DETAIL);
    expect(result.message).not.toContain(DESCRIPTION);
  });

  it("logs only safe diagnostics for an unexpected RPC failure and advises retrying", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    rpc.mockResolvedValue({ data: null, error: { code: "XX999", message: DATABASE_DETAIL } });

    const result = await createEventAction({ status: "error", message: "" }, eventForm());

    expect(result.status).toBe("error");
    expect(result.message).toMatch(/retry later/i);
    expect(result.message).not.toContain(DATABASE_DETAIL);
    expect(result.message).not.toContain(DESCRIPTION);
    expect(consoleError).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      "Unexpected create_crm_event RPC failure",
      expect.objectContaining({ code: "XX999", contextId: expect.any(String) }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(DATABASE_DETAIL);
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(DESCRIPTION);

    consoleError.mockRestore();
  });
});
