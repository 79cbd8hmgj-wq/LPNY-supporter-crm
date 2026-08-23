import { describe, expect, it } from "vitest";
import { readGetInvolvedForm } from "@/lib/intake/browser-form";

describe("readGetInvolvedForm", () => {
  it("reads the live form controls used for submission", () => {
    const form = document.createElement("form");
    form.innerHTML = `
      <input name="firstName" value="Test" />
      <input name="lastName" value="Supporter" />
      <input name="email" value="test@example.test" />
      <input name="phone" value="" />
      <input name="zipCode" value="10001" />
      <input type="checkbox" name="interests" value="events" checked />
      <input type="checkbox" name="interests" value="outreach" checked />
      <input type="checkbox" name="emailOptIn" checked />
      <input type="checkbox" name="phoneOptIn" />
      <input name="website" value="" />
    `;

    expect(readGetInvolvedForm(form)).toEqual({
      firstName: "Test",
      lastName: "Supporter",
      email: "test@example.test",
      phone: "",
      zipCode: "10001",
      interests: ["events", "outreach"],
      emailOptIn: true,
      phoneOptIn: false,
      website: "",
    });
  });

  it("drops unknown interest values from a tampered browser form", () => {
    const form = document.createElement("form");
    form.innerHTML = `
      <input name="firstName" value="Test" />
      <input name="lastName" value="Supporter" />
      <input name="email" value="test@example.test" />
      <input name="phone" value="" />
      <input name="zipCode" value="10001" />
      <input type="checkbox" name="interests" value="events" checked />
      <input type="checkbox" name="interests" value="not-a-real-interest" checked />
      <input name="website" value="" />
    `;

    expect(readGetInvolvedForm(form).interests).toEqual(["events"]);
  });
});
