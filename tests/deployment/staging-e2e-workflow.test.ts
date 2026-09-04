import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("deployed Staging E2E workflow", () => {
  const workflow = readFileSync(
    resolve(process.cwd(), ".github/workflows/staging-e2e.yml"),
    "utf8",
  );

  it("is manual, main-only, and uses the protected staging environment", () => {
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain("environment: staging");
    expect(workflow).toContain("PLAYWRIGHT_TARGET_ENV: staging");
  });

  it("requires staging-only secrets and locks the Supabase project", () => {
    expect(workflow).toContain("secrets.STAGING_BASE_URL");
    expect(workflow).toContain("secrets.STAGING_SUPABASE_URL");
    expect(workflow).toContain("secrets.STAGING_SUPABASE_ANON_KEY");
    expect(workflow).toContain("secrets.STAGING_SUPABASE_SERVICE_ROLE_KEY");
    expect(workflow).toContain("jcuxbutwcmgohyikpvcq.supabase.co");
  });

  it("refuses to run against a deployment from a different commit", () => {
    expect(workflow).toContain("health.commitSha !== process.env.GITHUB_SHA");
    expect(workflow).toContain("npm run test:e2e");
  });
});
