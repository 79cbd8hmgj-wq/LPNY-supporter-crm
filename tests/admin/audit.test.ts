import { describe, expect, it } from "vitest";
import type { Json } from "@/lib/supabase/database.types";
import {
  formatAuditAction,
  parseAuditPage,
  summarizeAuditMetadata,
} from "@/lib/admin/audit";

describe("Administration audit helpers", () => {
  it("parses only bounded positive page numbers", () => {
    expect(parseAuditPage(undefined)).toBe(1);
    expect(parseAuditPage("0")).toBe(1);
    expect(parseAuditPage("abc")).toBe(1);
    expect(parseAuditPage("100001")).toBe(1);
    expect(parseAuditPage(["7", "8"])).toBe(7);
    expect(parseAuditPage("42")).toBe(42);
  });

  it("formats snake-case action names while preserving CSV", () => {
    expect(formatAuditAction("people_csv_exported")).toBe("People CSV Exported");
    expect(formatAuditAction("staff_status_changed")).toBe("Staff Status Changed");
  });

  it("renders only the approved non-PII metadata keys", () => {
    const summaries = summarizeAuditMetadata({
      row_count: 12,
      active_filter_keys: ["county", "stage"],
      email: "supporter@example.test",
      filename: "supporters-private.csv",
      nested: { secret: "do not show" },
    } as Json);

    expect(summaries).toEqual([
      { label: "Row Count", value: "12" },
      { label: "Active Filter Keys", value: "county, stage" },
    ]);
    expect(JSON.stringify(summaries)).not.toContain("supporter@example.test");
    expect(JSON.stringify(summaries)).not.toContain("supporters-private.csv");
    expect(JSON.stringify(summaries)).not.toContain("do not show");
  });

  it("rejects nested or mixed array metadata even on an allowed key", () => {
    expect(summarizeAuditMetadata({
      active_filter_keys: ["county", { unsafe: "value" }],
    } as Json)).toEqual([]);
  });
});
