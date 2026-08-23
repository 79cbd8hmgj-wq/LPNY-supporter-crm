import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidZipError } from "@/lib/intake/geography";

const processSubmission = vi.hoisted(() => vi.fn());
vi.mock("@/lib/intake/service", () => ({
  processGetInvolvedSubmission: processSubmission,
}));

import { POST } from "@/app/api/intake/get-involved/route";

function request(body: unknown) {
  return new Request("http://localhost/api/intake/get-involved", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/intake/get-involved", () => {
  beforeEach(() => processSubmission.mockReset());

  it("returns safe field errors for invalid input", async () => {
    const response = await POST(request({ firstName: "Ada", lastName: "Lovelace", zipCode: "10001" }));
    expect(response.status).toBe(400);
    expect(processSubmission).not.toHaveBeenCalled();
  });

  it("silently accepts honeypot submissions without a CRM write", async () => {
    const response = await POST(request({
      firstName: "Bot",
      lastName: "Trap",
      email: "bot@example.com",
      zipCode: "10001",
      website: "https://spam.invalid",
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(processSubmission).not.toHaveBeenCalled();
  });

  it("returns the same generic success response for real submissions", async () => {
    processSubmission.mockResolvedValue(undefined);
    const response = await POST(request({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      zipCode: "10001",
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("maps invalid geography to a safe ZIP validation error", async () => {
    processSubmission.mockRejectedValue(new InvalidZipError());
    const response = await POST(request({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      zipCode: "00000",
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, errors: { zipCode: ["Enter a valid ZIP code"] } });
  });

  it("does not expose database details on server failure", async () => {
    processSubmission.mockRejectedValue(new Error("private database detail"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await POST(request({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      zipCode: "10001",
    }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false });
    spy.mockRestore();
  });
});
