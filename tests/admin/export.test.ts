import { describe, expect, it } from "vitest";
import type { PeopleFilterState } from "@/lib/crm/people-filters";
import {
  EXPORT_HEADERS,
  activeExportFilterKeys,
  serializePeopleExportCsv,
  type PeopleExportRow,
} from "@/lib/admin/export";

const row: PeopleExportRow = {
  person_id: "20000000-0000-4000-8000-000000001501",
  first_name: "Jane",
  last_name: "Doe",
  email: "jane@example.com",
  phone: "+1 (518) 555-0150",
  zip_code: "12207",
  county: "Albany",
  municipality: "Albany",
  engagement_stage: "engaged",
  assigned_organizer: "Organizer One",
  relationships: "Supporter; Member",
  interests: "Events; Outreach",
  tags: "Volunteer",
  do_not_contact: false,
  created_at: "2026-08-31T12:00:00.000Z",
  last_activity_at: "2026-08-31T13:00:00.000Z",
};

describe("Admin people CSV export", () => {
  it("uses the approved stable column order", () => {
    expect(EXPORT_HEADERS).toEqual([
      "person_id",
      "first_name",
      "last_name",
      "email",
      "phone",
      "zip_code",
      "county",
      "municipality",
      "engagement_stage",
      "assigned_organizer",
      "relationships",
      "interests",
      "tags",
      "do_not_contact",
      "created_at",
      "last_activity_at",
    ]);
  });

  it("RFC4180-escapes commas, quotes, and embedded newlines", () => {
    const csv = serializePeopleExportCsv([{
      ...row,
      first_name: "Jane, Jr.",
      municipality: "North \"Central\"\nDistrict",
    }]);

    expect(csv).toContain('"Jane, Jr."');
    expect(csv).toContain('"North ""Central""\nDistrict"');
    expect(csv.split("\r\n")[0]).toBe(EXPORT_HEADERS.join(","));
  });

  it("neutralizes spreadsheet formulas in user-controlled cells", () => {
    const csv = serializePeopleExportCsv([{
      ...row,
      first_name: "=HYPERLINK(\"https://example.test\")",
      phone: "+15185550150",
    }]);

    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+15185550150");
  });

  it("serializes only approved export fields and never internal-note data", () => {
    const withUnexpectedData = {
      ...row,
      internal_note: "sensitive internal note body",
    } as PeopleExportRow & { internal_note: string };

    const csv = serializePeopleExportCsv([withUnexpectedData]);
    expect(csv).not.toContain("sensitive internal note body");
    expect(csv).toContain("jane@example.com");
  });

  it("records only active filter keys rather than query/contact values", () => {
    const filters: PeopleFilterState = {
      query: "jane@example.com",
      countyId: "10000000-0000-4000-8000-000000001501",
      zipCode: "12207",
      engagementStage: "engaged",
      relationshipSlug: null,
      interestSlug: "events",
      tagId: null,
      organizerId: null,
      sourceSlug: "website-get-involved",
      joinedAfter: null,
      joinedBefore: null,
      inactiveDays: 90,
      hasOpenTask: true,
      candidateInterest: null,
      memberStatus: "member",
      page: 7,
    };

    const keys = activeExportFilterKeys(filters);
    expect(keys).toEqual([
      "query",
      "county",
      "zip",
      "stage",
      "interest",
      "source",
      "inactiveDays",
      "openTask",
      "memberStatus",
    ]);
    expect(JSON.stringify(keys)).not.toContain("jane@example.com");
    expect(JSON.stringify(keys)).not.toContain("12207");
    expect(keys).not.toContain("page");
  });
});
