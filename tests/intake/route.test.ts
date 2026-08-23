import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/intake/service", () => ({
  processGetInvolvedSubmission: vi.fn(),
}));

import { handleGetInvolvedRequest } from "@/app/api/intake/get-involved/route";
import { InvalidZipError } from "@/lib/intake/geography";

function request(body: unknown) {
  return new Request("http://localhost/api/intake/get-involved", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/intake/get-involved", () => {
  it("returns safe field errors for invalid input", async () => {
    const processSubmission = vi.fn(async () => undefined);
    const response = await handleGetInvolvedRequest(
      request({ firstName: "Ada", lastName: "Lovelace", zipCode: "10001" }),
      processSubmission,
    );
    expect(response.status).toBe(400);
    expect(processSubmission).not.toHaveBeenCalled();
  });

  it("silently accepts honeypot submissions without a CRM write", async () => {
    const processSubmission = vi.fn(async () => undefined);
    const response = await handleGetInvolvedRequest(request({
      firstName: "Bot",
      lastName: "Trap",
      email: "bot@example.com",
      zipCode: "10001",
      website: "https://spam.invalid",
    }), processSubmission);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(processSubmission).not.toHaveBeenCalled();
  });

  it("returns the same generic success response for real submissions", async () => {
    const response = await handleGetInvolvedRequest(request({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      zipCode: "10001",
    }), async () => undefined);
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
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, errors: { zipCode: ["Enter a valid ZIP code"] } });
  });

  it("does not expose database details on server failure", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await handleGetInvolvedRequest(request({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      zipCode: "10001",
    }), async () => {
      throw new Error("private database detail");
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false });
    spy.mockRestore();
  });
});
