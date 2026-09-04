import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CrmNavigation } from "@/app/crm/crm-navigation";

describe("CRM navigation", () => {
  it("shows the Events & Tasks tab to state organizers", () => {
    render(<CrmNavigation role="state_organizer" />);

    expect(screen.getByRole("link", { name: "Events & Tasks" })).toHaveAttribute("href", "/crm/work");
    expect(screen.getByRole("link", { name: "Administration" })).toHaveAttribute("href", "/crm/admin");
  });
});
