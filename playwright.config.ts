import { defineConfig, devices } from "@playwright/test";

const localBaseURL = "http://localhost:3000";
const configuredBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim();
const targetEnvironment = process.env.PLAYWRIGHT_TARGET_ENV?.trim().toLowerCase();
const vercelAutomationBypassSecret =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
const targetsDeployment = Boolean(configuredBaseURL);

if (targetsDeployment && targetEnvironment !== "staging") {
  throw new Error("Remote mutating Playwright E2E is allowed only against staging.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: {
    baseURL: configuredBaseURL || localBaseURL,
    trace: "on-first-retry",
    extraHTTPHeaders:
      targetsDeployment && vercelAutomationBypassSecret
        ? {
            "x-vercel-protection-bypass": vercelAutomationBypassSecret,
            "x-vercel-set-bypass-cookie": "true",
          }
        : undefined,
  },
  webServer: targetsDeployment
    ? undefined
    : {
        command: "npm run dev",
        url: localBaseURL,
        env: {
          ...process.env,
          APP_URL: process.env.APP_URL?.trim() || localBaseURL,
        },
        reuseExistingServer: !process.env.CI,
      },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit-mobile", use: { ...devices["iPhone 13"], browserName: "webkit" } },
  ],
});
