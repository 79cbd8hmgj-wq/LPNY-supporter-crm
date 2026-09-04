import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { createEventAction } = vi.hoisted(() => ({ createEventAction: vi.fn() }));

vi.mock("@/app/crm/work/actions", () => ({
  createEventAction,
  createTaskAction: vi.fn(),
}));

import { EventForm } from "@/app/crm/work/work-forms";

describe("EventForm", () => {
  it("restores every submitted field after an action-level failure", async () => {
    createEventAction.mockImplementation(async (_previous, formData: FormData) => ({
      status: "error",
      message: "The event could not be created.",
      values: Object.fromEntries(formData.entries()),
    }));
    render(<EventForm />);

    const submitted = {
      title: "Capital District volunteer night",
      location: "Albany field office",
      startsAt: "2026-09-10T18:30",
      endsAt: "2026-09-10T20:00",
      description: "Orientation, phone banking, and pizza.",
      visibility: "supporters",
    };

    fireEvent.change(screen.getByLabelText("Event title"), { target: { value: submitted.title } });
    fireEvent.change(screen.getByLabelText("Location"), { target: { value: submitted.location } });
    fireEvent.change(screen.getByLabelText("Starts"), { target: { value: submitted.startsAt } });
    fireEvent.change(screen.getByLabelText("Ends (optional)"), { target: { value: submitted.endsAt } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: submitted.description } });
    fireEvent.change(screen.getByLabelText("Who can see this event?"), { target: { value: submitted.visibility } });
    fireEvent.submit(screen.getByRole("button", { name: "Create event" }).closest("form")!);

    await screen.findByText("The event could not be created.");
    await waitFor(() => {
      expect(screen.getByLabelText("Event title")).toHaveValue(submitted.title);
      expect(screen.getByLabelText("Location")).toHaveValue(submitted.location);
      expect(screen.getByLabelText("Starts")).toHaveValue(submitted.startsAt);
      expect(screen.getByLabelText("Ends (optional)")).toHaveValue(submitted.endsAt);
      expect(screen.getByLabelText("Description")).toHaveValue(submitted.description);
      expect(screen.getByLabelText("Who can see this event?")).toHaveValue(submitted.visibility);
    });
  });
});
