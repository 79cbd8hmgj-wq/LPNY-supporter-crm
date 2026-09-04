import { afterEach, describe, expect, it, vi } from "vitest";

async function loadConfig() {
  vi.resetModules();
  return (await import("../../playwright.config")).default;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Playwright deployment targeting", () => {
  it("uses the local development server by default", async () => {
    vi.stubEnv("PLAYWRIGHT_BASE_URL", "");
    vi.stubEnv("PLAYWRIGHT_TARGET_ENV", "");

    const config = await loadConfig();
    expect(config.use).toMatchObject({ baseURL: "http://127.0.0.1:3000" });
    expect(config.webServer).toMatchObject({
      url: "http://127.0.0.1:3000",
      env: expect.objectContaining({ APP_URL: "http://127.0.0.1:3000" }),
    });
  });

  it("targets an explicit staging deployment without starting a local server", async () => {
    vi.stubEnv("PLAYWRIGHT_BASE_URL", "https://crm-staging.example.test");
    vi.stubEnv("PLAYWRIGHT_TARGET_ENV", "staging");

    const config = await loadConfig();
    expect(config.use).toMatchObject({ baseURL: "https://crm-staging.example.test" });
    expect(config.webServer).toBeUndefined();
  });

  it("refuses remote mutating E2E unless the target is explicitly staging", async () => {
    vi.stubEnv("PLAYWRIGHT_BASE_URL", "https://crm.example.test");
    vi.stubEnv("PLAYWRIGHT_TARGET_ENV", "production");

    await expect(loadConfig()).rejects.toThrow(/staging/i);
  });
});
