import { describe, expect, it } from "vitest";
import { getStaffInvitationErrorMessage } from "@/lib/admin/staff-invitation-error";

describe("staff invitation errors", () => {
  it("explains when an Auth account already exists", () => {
    expect(getStaffInvitationErrorMessage({
      code: "email_exists",
      message: "A user with this email address has already been registered",
      status: 422,
    })).toContain("already has a Supabase Auth account");
  });

  it("gives retry guidance for email rate limits", () => {
    expect(getStaffInvitationErrorMessage({
      code: "over_email_send_rate_limit",
      message: "Email rate limit exceeded",
      status: 429,
    })).toContain("Wait a few minutes");
  });

  it("directs administrators to email settings for SMTP failures", () => {
    expect(getStaffInvitationErrorMessage({
      message: "Error sending confirmation email",
      status: 500,
    })).toContain("Auth email and SMTP settings");
  });

  it("does not expose an unknown upstream error", () => {
    expect(getStaffInvitationErrorMessage({
      message: "private upstream details",
      status: 500,
    })).toBe("Supabase could not create this invitation. Check the Auth logs for the specific error, then try again.");
  });
});
