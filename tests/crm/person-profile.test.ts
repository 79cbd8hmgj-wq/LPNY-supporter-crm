import { describe, expect, test } from "vitest";
import { mapPersonProfileData } from "@/lib/crm/person-profile";

describe("supporter profile mapping", () => {
  test("normalizes identity and sorts historical sections newest first", () => {
    const profile = mapPersonProfileData({
      person: {
        id: "20000000-0000-0000-0000-000000000401",
        first_name: "Avery",
        last_name: "Organizer",
        email: "avery@example.test",
        phone: "5185550101",
        zip_code: "12207",
        municipality: "Albany",
        engagement_stage: "engaged",
        assigned_staff_user_id: "10000000-0000-0000-0000-000000000401",
        do_not_contact: false,
        last_activity_at: "2026-08-22T16:00:00Z",
        created_at: "2026-01-15T14:00:00Z",
      },
      countyName: "Albany",
      assignedOrganizerName: "Organizer One",
      relationships: [{ name: "Volunteer" }, { name: "Member" }],
      interests: [{ name: "Local activism" }, { name: "Events" }],
      tags: [{ name: "Good speaker" }],
      activities: [
        { id: "activity-old", activity_type: "form_submitted", occurred_at: "2026-08-01T12:00:00Z", metadata: {} },
        { id: "activity-new", activity_type: "contacted", occurred_at: "2026-08-22T16:00:00Z", metadata: { outcome: "spoke" } },
      ],
      tasks: [
        { id: "task-old", task_type: "initial_follow_up", status: "completed", priority: "normal", due_at: "2026-08-02T12:00:00Z", completed_at: "2026-08-03T12:00:00Z", created_at: "2026-08-01T12:00:00Z" },
        { id: "task-new", task_type: "follow_up", status: "open", priority: "high", due_at: "2026-08-25T12:00:00Z", completed_at: null, created_at: "2026-08-22T12:00:00Z" },
      ],
      sources: [
        { id: "source-old", name: "Website", category: "website", occurred_at: "2026-01-15T14:00:00Z", metadata: {} },
        { id: "source-new", name: "County Fair", category: "event", occurred_at: "2026-08-20T14:00:00Z", metadata: {} },
      ],
      consent: [
        { id: "consent-old", channel: "email", state: "opted_in", effective_at: "2026-01-15T14:00:00Z", sourceName: "Website" },
        { id: "consent-new", channel: "email", state: "opted_out", effective_at: "2026-08-21T14:00:00Z", sourceName: null },
      ],
      notes: [
        { id: "note-old", body: "First note", authorName: "Organizer One", created_at: "2026-08-10T14:00:00Z", edited_at: null },
        { id: "note-new", body: "Most recent note", authorName: "Organizer One", created_at: "2026-08-22T15:00:00Z", edited_at: null },
      ],
    });

    expect(profile.name).toBe("Avery Organizer");
    expect(profile.location).toEqual({ municipality: "Albany", countyName: "Albany", zipCode: "12207" });
    expect(profile.relationships).toEqual(["Member", "Volunteer"]);
    expect(profile.interests).toEqual(["Events", "Local activism"]);
    expect(profile.tags).toEqual(["Good speaker"]);
    expect(profile.activities.map((item) => item.id)).toEqual(["activity-new", "activity-old"]);
    expect(profile.tasks.map((item) => item.id)).toEqual(["task-new", "task-old"]);
    expect(profile.sources.map((item) => item.id)).toEqual(["source-new", "source-old"]);
    expect(profile.consent.map((item) => item.id)).toEqual(["consent-new", "consent-old"]);
    expect(profile.notes.map((item) => item.id)).toEqual(["note-new", "note-old"]);
  });
});
