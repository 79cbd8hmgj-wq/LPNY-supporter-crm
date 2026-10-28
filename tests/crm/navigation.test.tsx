import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/crm/sign-out-action", () => ({ staffSignOutAction: vi.fn() }));
import { CrmNavigation } from "@/app/crm/crm-navigation";

describe("CRM navigation", () => {
  it("shows the Events & Tasks tab to state organizers", () => {
    const { unmount } = render(<CrmNavigation role="state_organizer" />);

    expect(screen.getByRole("link", { name: "Events & Tasks" })).toHaveAttribute("href", "/crm/work");
    expect(screen.getByRole("link", { name: "Administration" })).toHaveAttribute("href", "/crm/admin");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
    unmount();
  });

  it("shows a staff sign-out control to every CRM role", () => {
    for (const role of ["admin", "state_organizer", "county_organizer", "volunteer_staff"] as const) {
      const { unmount } = render(<CrmNavigation role={role} />);
      expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
      unmount();
    }
  });
});
