import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("deployed Staging E2E workflow", () => {
  const workflow = readFileSync(
    resolve(process.cwd(), ".github/workflows/staging-e2e.yml"),
    "utf8",
  );

  it("runs automatically for staging pushes, supports manual reruns, and uses the protected environment", () => {
    expect(workflow).toContain("push:");
    expect(workflow).toContain("- staging");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("github.ref == 'refs/heads/staging'");
    expect(workflow).toContain("environment: staging");
    expect(workflow).toContain("PLAYWRIGHT_TARGET_ENV: staging");
  });

  it("uses fixed public Staging endpoints and keeps only the service-role credential secret", () => {
    expect(workflow).toContain("https://lpny-supporter-crm-git-staging-calypso-digital.vercel.app");
    expect(workflow).toContain("https://jcuxbutwcmgohyikpvcq.supabase.co");
    expect(workflow).toContain("sb_publishable_");
    expect(workflow).toContain("secrets.STAGING_SUPABASE_SERVICE_ROLE_KEY");
    expect(workflow).not.toContain("secrets.STAGING_BASE_URL");
    expect(workflow).not.toContain("secrets.STAGING_SUPABASE_URL");
    expect(workflow).not.toContain("secrets.STAGING_SUPABASE_ANON_KEY");
  });

  it("refuses to run against a deployment from a different commit", () => {
    expect(workflow).toContain("health.commitSha !== process.env.GITHUB_SHA");
    expect(workflow).toContain('health.dataEnvironment !== "staging"');
    expect(workflow).toContain("npm run test:e2e");
  });
});
