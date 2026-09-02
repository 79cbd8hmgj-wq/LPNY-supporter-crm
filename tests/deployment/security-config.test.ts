import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("production response headers", () => {
  it("applies a defensive baseline to every route", async () => {
    expect(nextConfig.headers).toBeTypeOf("function");

    const rules = await nextConfig.headers!();
    const allRoutes = rules.find((rule) => rule.source === "/(.*)");
    expect(allRoutes).toBeDefined();

    const headers = new Map(allRoutes!.headers.map((header) => [header.key, header.value]));
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");

    const csp = headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("object-src 'none'");
  });
});
