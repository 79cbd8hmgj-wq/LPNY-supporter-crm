import { describe, expect, it, vi } from "vitest";

describe("getServerEnv", () => {
  it("rejects a missing service-role key at call time", async () => {
    const priorUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const priorAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const priorService = process.env.SUPABASE_SERVICE_ROLE_KEY;

    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.resetModules();

    const { getServerEnv } = await import("@/lib/env");
    expect(() => getServerEnv()).toThrow();

    if (priorUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = priorUrl;
    if (priorAnon === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = priorAnon;
    if (priorService === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = priorService;
  });
});
