import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";
import { getBuildMetadata } from "@/lib/deployment/build-metadata";

describe("deployment build metadata", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allowlists and abbreviates a valid Vercel commit SHA", () => {
    expect(getBuildMetadata({
      VERCEL_GIT_COMMIT_SHA: "ABCDEF0123456789ABCDEF0123456789ABCDEF01",
    })).toEqual({
      commitSha: "abcdef0123456789abcdef0123456789abcdef01",
      release: "abcdef0",
    });
  });

  it("does not expose malformed environment content", () => {
    expect(getBuildMetadata({ VERCEL_GIT_COMMIT_SHA: "not-a-sha:secret" })).toEqual({
      commitSha: null,
      release: "local",
    });
  });

  it("serves only non-sensitive metadata without caching", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "0123456789abcdef0123456789abcdef01234567");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "must-not-leak");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://jcuxbutwcmgohyikpvcq.supabase.co");

    const response = GET();

    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    const body = await response.json();
    expect(body).toEqual({
      status: "ok",
      release: "0123456",
      commitSha: "0123456789abcdef0123456789abcdef01234567",
      dataEnvironment: "staging",
    });
    expect(JSON.stringify(body)).not.toContain("must-not-leak");
    expect(JSON.stringify(body)).not.toContain("jcuxbutwcmgohyikpvcq");
  });
});
