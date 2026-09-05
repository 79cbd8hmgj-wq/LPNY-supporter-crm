import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/supporter/rsvp-actions", () => ({
  setSupporterRsvpAction: vi.fn(),
  supporterRsvpInitialState: { status: "idle", message: "" },
}));

import { SupporterRsvpForm } from "@/app/supporter/supporter-rsvp-form";

describe("SupporterRsvpForm", () => {
  it("offers an RSVP for an event the supporter is not attending", () => {
    render(<SupporterRsvpForm eventId="40000000-0000-0000-0000-000000000741" status={null} />);
    expect(screen.getByRole("button", { name: "I’m going" })).toBeInTheDocument();
  });

  it("offers cancellation for an existing RSVP", () => {
    render(<SupporterRsvpForm eventId="40000000-0000-0000-0000-000000000741" status="going" />);
    expect(screen.getByRole("button", { name: "Cancel RSVP" })).toBeInTheDocument();
  });
});
