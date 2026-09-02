import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/intake/service", () => ({
  processGetInvolvedSubmission: vi.fn(),
}));

vi.mock("@/lib/intake/rate-limit", () => ({
  isIntakeRateLimited: vi.fn(async () => false),
}));

import { handleGetInvolvedRequest } from "@/app/api/intake/get-involved/route";
import { InvalidZipError } from "@/lib/intake/geography";

const allowRequest = async () => false;

function request(body: unknown) {
  return new Request("http://localhost/api/intake/get-involved", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.42" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/intake/get-involved", () => {
  it("rejects oversized request bodies before validation, rate limiting, or CRM writes", async () => {
    const processSubmission = vi.fn(async () => undefined);
    const checkRateLimit = vi.fn(async () => false);
    const response = await handleGetInvolvedRequest(request({
      firstName: "A".repeat(20_000),
      lastName: "Lovelace",
      email: "ada@example.com",
      zipCode: "10001",
    }), processSubmission, checkRateLimit);

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ ok: false });
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(processSubmission).not.toHaveBeenCalled();
  });

  it("returns 429 without processing when the intake rate limit is exceeded", async () => {
    const processSubmission = vi.fn(async () => undefined);
    const checkRateLimit = vi.fn(async () => true);
    const response = await handleGetInvolvedRequest(request({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      zipCode: "10001",
    }), processSubmission, checkRateLimit);

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ ok: false });
    expect(checkRateLimit).toHaveBeenCalledOnce();
    expect(processSubmission).not.toHaveBeenCalled();
  });

  it("returns safe field errors for invalid input", async () => {
    const processSubmission = vi.fn(async () => undefined);
    const response = await handleGetInvolvedRequest(
      request({ firstName: "Ada", lastName: "Lovelace", zipCode: "10001" }),
      processSubmission,
      allowRequest,
    );
    expect(response.status).toBe(400);
    expect(processSubmission).not.toHaveBeenCalled();
  });

  it("silently accepts honeypot submissions without a CRM write or rate-limit call", async () => {
    const processSubmission = vi.fn(async () => undefined);
    const checkRateLimit = vi.fn(async () => false);
    const response = await handleGetInvolvedRequest(request({
      firstName: "Bot",
      lastName: "Trap",
      email: "bot@example.com",
      zipCode: "10001",
      website: "https://spam.invalid",
    }), processSubmission, checkRateLimit);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(processSubmission).not.toHaveBeenCalled();
  });

  it("returns the same generic success response for real submissions", async () => {
    const response = await handleGetInvolvedRequest(request({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      zipCode: "10001",
    }), async () => undefined, allowRequest);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("maps invalid geography to a safe ZIP validation error", async () => {
    const response = await handleGetInvolvedRequest(request({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      zipCode: "00000",
    }), async () => {
      throw new InvalidZipError();
    }, allowRequest);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, errors: { zipCode: ["Enter a valid ZIP code"] } });
  });

  it("does not expose or log database details on server failure", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await handleGetInvolvedRequest(request({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      zipCode: "10001",
    }), async () => {
      throw new Error("private database detail");
    }, allowRequest);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false });
    expect(spy).toHaveBeenCalledWith("Get involved intake failed");
    expect(spy.mock.calls.flat().join(" ")).not.toContain("private database detail");
    spy.mockRestore();
  });
});
