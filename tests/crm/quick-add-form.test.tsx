import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/crm/quick-add/actions", () => ({
  quickAddAction: vi.fn(),
}));

import { QuickAddForm } from "@/app/crm/quick-add/quick-add-form";

describe("QuickAddForm", () => {
  it("renders the minimal phone-friendly organizer intake fields", () => {
    render(<QuickAddForm />);

    expect(screen.getByLabelText("First name")).toBeRequired();
    expect(screen.getByLabelText("Last name")).toBeRequired();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Phone")).toHaveAttribute("type", "tel");
    expect(screen.getByLabelText("ZIP code")).toBeRequired();
    expect(screen.getByRole("button", { name: "Add supporter" })).toBeEnabled();
    expect(screen.getAllByText("Email or phone is required")).toHaveLength(2);
  });
});
