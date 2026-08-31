import { describe, expect, it } from "vitest";
import {
  CSV_MAX_BYTES,
  CSV_MAX_DATA_ROWS,
  parseCsv,
} from "@/lib/admin/csv";

describe("parseCsv", () => {
  it("parses quoted commas, embedded newlines, escaped quotes, CRLF, and empty cells", () => {
    const parsed = parseCsv(
      "Name,Notes,Email,Empty\r\n\"Doe, Jane\",\"Line one\nLine two with \"\"quotes\"\"\",jane@example.com,\r\n",
    );

    expect(parsed.headers).toEqual(["Name", "Notes", "Email", "Empty"]);
    expect(parsed.rows).toEqual([
      ["Doe, Jane", "Line one\nLine two with \"quotes\"", "jane@example.com", ""],
    ]);
  });

  it("preserves an empty trailing field without creating a phantom row", () => {
    const parsed = parseCsv("First,Last,Email\nJane,Doe,\n");

    expect(parsed.rows).toEqual([["Jane", "Doe", ""]]);
  });

  it("rejects malformed unterminated quoted fields", () => {
    expect(() => parseCsv('First,Notes\nJane,"unfinished')).toThrow(/unterminated/i);
  });

  it("rejects imports above the data-row limit", () => {
    const rows = Array.from({ length: CSV_MAX_DATA_ROWS + 1 }, (_, index) => `Person${index},Test`).join("\n");

    expect(() => parseCsv(`First,Last\n${rows}`)).toThrow(/5,000/i);
  });

  it("rejects imports above the byte-size limit", () => {
    const oversized = `First,Last\n${"a".repeat(CSV_MAX_BYTES)}`;

    expect(() => parseCsv(oversized)).toThrow(/2 MiB/i);
  });
});
