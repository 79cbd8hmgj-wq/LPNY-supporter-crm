import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({ rpc }),
}));

import { processGetInvolvedSubmission } from "@/lib/intake/service";

describe("processGetInvolvedSubmission", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: "person-id", error: null });
  });

  it("normalizes and resolves input before calling the atomic RPC", async () => {
    await processGetInvolvedSubmission({
      firstName: " Ada ",
      lastName: " Lovelace ",
      email: " ADA@Example.com ",
      phone: "+1 (212) 555-0101",
      zipCode: "10001",
      interests: ["events"],
      emailOptIn: true,
      phoneOptIn: true,
      website: "",
    });

    expect(rpc).toHaveBeenCalledWith("process_get_involved_intake", expect.objectContaining({
      p_first_name: "Ada",
      p_last_name: "Lovelace",
      p_normalized_email: "ada@example.com",
      p_normalized_phone: "2125550101",
      p_zip_code: "10001",
      p_county_name: "New York",
      p_interest_slugs: ["events"],
      p_email_opt_in: true,
      p_phone_opt_in: true,
    }));
  });

  it("throws a generic database error code when the RPC fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    await expect(processGetInvolvedSubmission({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "",
      zipCode: "10001",
      interests: [],
      emailOptIn: false,
      phoneOptIn: false,
      website: "",
    })).rejects.toThrow("XX000");
  });
});
