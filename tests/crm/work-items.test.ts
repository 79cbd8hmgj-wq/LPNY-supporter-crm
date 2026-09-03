import { describe, expect, it } from "vitest";
import { validateEventInput, validateTaskInput } from "@/lib/crm/work-items";

const personId = "20000000-0000-0000-0000-000000000401";

describe("work item validation", () => {
  it("accepts a named supporter task", () => {
    expect(validateTaskInput({ personId, title: "  Call about volunteering  ", dueAt: "2026-09-04T09:00", priority: "high" })).toEqual({
      personId, title: "Call about volunteering", dueAt: "2026-09-04T13:00:00.000Z", priority: "high",
    });
  });

  it("rejects malformed tasks", () => {
    expect(validateTaskInput({ personId: "bad", title: "Call", dueAt: "2026-09-04T09:00", priority: "high" })).toBeNull();
    expect(validateTaskInput({ personId, title: "", dueAt: "2026-09-04T09:00", priority: "high" })).toBeNull();
  });

  it("accepts events and requires the end to follow the start", () => {
    expect(validateEventInput({ title: "Volunteer meetup", location: "Albany", description: "Planning", startsAt: "2026-09-04T18:00", endsAt: "2026-09-04T19:00" })).toMatchObject({ title: "Volunteer meetup", location: "Albany" });
    expect(validateEventInput({ title: "Volunteer meetup", location: "", description: "", startsAt: "2026-09-04T19:00", endsAt: "2026-09-04T18:00" })).toBeNull();
  });
});
