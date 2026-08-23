import { describe, expect, it } from "vitest";
import { getServerEnv } from "@/lib/env";

describe("getServerEnv", () => {
  it("rejects a missing service-role key at call time", () => {
    const previous = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => getServerEnv()).toThrow();
    if (previous === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previous;
  });
});
