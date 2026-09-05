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
    expect(workflow).toContain("JSON.parse(process.env.HEALTH_RESPONSE");
    expect(workflow).not.toContain("const response = await fetch(healthUrl");
  });

  it("waits for Vercel to serve the exact staging commit before failing", () => {
    expect(workflow).toContain("for attempt in {1..30}");
    expect(workflow).toContain("Waiting for Vercel to serve ${GITHUB_SHA}");
    expect(workflow).toContain("sleep 10");
    expect(workflow).toContain("Staging did not reach the workflow commit before the deployment wait expired");
  });

  it("accepts an older deployed ancestor only when intervening changes are non-deploying", () => {
    expect(workflow).toContain("fetch-depth: 0");
    expect(workflow).toContain("git merge-base --is-ancestor");
    expect(workflow).toContain("git diff --name-only");
    expect(workflow).toContain('file.startsWith(".github/")');
    expect(workflow).toContain('file.startsWith("tests/")');
    expect(workflow).toContain('file.startsWith("docs/")');
    expect(workflow).toContain('file === "README.md"');
    expect(workflow).toContain("Application-equivalent staging deployment accepted");
  });

  it("refuses to run against a deployment from a different data environment", () => {
    expect(workflow).toContain('health.dataEnvironment !== "staging"');
    expect(workflow).toContain("npm run test:e2e");
  });

  it("cleans reserved browser fixtures before and after deployed E2E", () => {
    const cleanupCalls = workflow.match(/node scripts\/cleanup-staging-e2e\.mjs/g) ?? [];
    expect(cleanupCalls).toHaveLength(2);
    expect(workflow).toContain("id: install");
    expect(workflow).toContain("if: always() && steps.install.outcome == 'success'");

    const cleanupScript = readFileSync(
      resolve(process.cwd(), "scripts/cleanup-staging-e2e.mjs"),
      "utf8",
    );
    expect(cleanupScript).toContain("jcuxbutwcmgohyikpvcq.supabase.co");
    expect(cleanupScript).toContain("@example.test");
    expect(cleanupScript).toContain("PLAYWRIGHT_TARGET_ENV");
  });
});
