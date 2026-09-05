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

  it("uses fixed public Staging endpoints and protects server-side credentials", () => {
    expect(workflow).toContain("https://lpny-supporter-crm-git-staging-calypso-digital.vercel.app");
    expect(workflow).toContain("https://jcuxbutwcmgohyikpvcq.supabase.co");
    expect(workflow).toContain("sb_publishable_");
    expect(workflow).toContain("STAGING_SUPABASE_SERVICE_ROLE_KEY");
    expect(workflow).toContain("STAGING_VERCEL_AUTOMATION_BYPASS_SECRET");
    expect(workflow).not.toContain("STAGING_BASE_URL");
    expect(workflow).not.toContain("STAGING_SUPABASE_URL");
    expect(workflow).not.toContain("STAGING_SUPABASE_ANON_KEY");
  });

  it("uses the Vercel bypass header for health checks and reserves the bypass cookie for browsers", () => {
    expect(workflow).toContain("STAGING_VERCEL_AUTOMATION_BYPASS_SECRET is not configured");
    expect(workflow).toContain("x-vercel-protection-bypass");
    expect(workflow).not.toContain("x-vercel-set-bypass-cookie");

    const playwrightConfig = readFileSync(
      resolve(process.cwd(), "playwright.config.ts"),
      "utf8",
    );
    expect(playwrightConfig).toContain("x-vercel-protection-bypass");
    expect(playwrightConfig).toContain("VERCEL_AUTOMATION_BYPASS_SECRET");
    expect(playwrightConfig).toContain("x-vercel-set-bypass-cookie");
  });

  it("uses curl for the protected health request before parsing the response", () => {
    expect(workflow).toContain("curl --fail-with-body --location");
    expect(workflow).toContain('HEALTH_RESPONSE="$(curl');
    expect(workflow).toContain("JSON.parse(process.env.HEALTH_RESPONSE");
    expect(workflow).not.toContain("const response = await fetch(healthUrl");
  });

  it("refuses to run against a deployment from a different commit", () => {
    expect(workflow).toContain("health.commitSha !== process.env.GITHUB_SHA");
    expect(workflow).toContain('health.dataEnvironment !== "staging"');
    expect(workflow).toContain("npm run test:e2e");
  });
});
