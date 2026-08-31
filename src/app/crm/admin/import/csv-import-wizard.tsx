"use client";

import { useMemo, useState, useTransition } from "react";
import {
  canonicalImportFields,
  type CanonicalImportField,
  type CsvColumnMapping,
  type CsvImportDecision,
  type CsvImportDecisionSelection,
  type CsvImportPreview,
  type CsvImportPreviewRow,
  type ImportMatchPerson,
} from "@/lib/admin/import-preview";
import { CSV_MAX_BYTES, parseCsv } from "@/lib/admin/csv";
import { applyCsvImportAction, previewCsvImportAction } from "./actions";

const ROWS_PER_PAGE = 50;

const fieldLabels: Record<CanonicalImportField, string> = {
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  phone: "Phone",
  zip_code: "ZIP code",
  municipality: "Municipality / city",
  engagement_stage: "Engagement stage",
  relationship: "Relationship",
  interests: "Interests",
  tags: "Tags",
  source: "Source",
};

const headerAliases: Record<string, CanonicalImportField> = {
  firstname: "first_name",
  first: "first_name",
  lastname: "last_name",
  last: "last_name",
  surname: "last_name",
  email: "email",
  emailaddress: "email",
  phone: "phone",
  phonenumber: "phone",
  mobile: "phone",
  zipcode: "zip_code",
  zip: "zip_code",
  postalcode: "zip_code",
  municipality: "municipality",
  city: "municipality",
  citytown: "municipality",
  engagementstage: "engagement_stage",
  stage: "engagement_stage",
  relationship: "relationship",
  interest: "interests",
  interests: "interests",
  tag: "tags",
  tags: "tags",
  source: "source",
  sourceslug: "source",
};

function normalizedHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function guessMapping(headers: readonly string[]): CsvColumnMapping {
  const used = new Set<CanonicalImportField>();
  return headers.map((header) => {
    const guessed = headerAliases[normalizedHeader(header)];
    if (!guessed || used.has(guessed)) return null;
    used.add(guessed);
    return guessed;
  });
}

function mappingReady(mapping: CsvColumnMapping): boolean {
  const chosen = mapping.filter((field): field is CanonicalImportField => field !== null);
  const unique = new Set(chosen);
  return chosen.length === unique.size
    && unique.has("first_name")
    && unique.has("last_name")
    && (unique.has("email") || unique.has("phone"));
}

function classificationLabel(value: CsvImportPreviewRow["classification"]): string {
  switch (value) {
    case "new": return "New supporter";
    case "exact_email_match": return "Exact email match";
    case "ambiguous_phone_match": return "Possible phone match";
    case "invalid": return "Invalid row";
  }
}

function classificationClasses(value: CsvImportPreviewRow["classification"]): string {
  switch (value) {
    case "new": return "bg-emerald-50 text-emerald-800";
    case "exact_email_match": return "bg-blue-50 text-blue-800";
    case "ambiguous_phone_match": return "bg-amber-50 text-amber-800";
    case "invalid": return "bg-red-50 text-red-800";
  }
}

function matchLabel(id: string, matches: readonly ImportMatchPerson[]): string {
  const match = matches.find((person) => person.id === id);
  return match ? `${match.firstName} ${match.lastName}` : "Existing supporter";
}

function selectionValue(selection: CsvImportDecisionSelection): string {
  if (selection.decision === "update_existing" && selection.existingPersonId) {
    return `update:${selection.existingPersonId}`;
  }
  return selection.decision;
}

function parseSelectionValue(rowNumber: number, value: string): CsvImportDecisionSelection {
  if (value.startsWith("update:")) {
    return { rowNumber, decision: "update_existing", existingPersonId: value.slice("update:".length) };
  }
  return {
    rowNumber,
    decision: value as Exclude<CsvImportDecision, "update_existing">,
    existingPersonId: null,
  };
}

function defaultSelections(preview: CsvImportPreview): Record<number, CsvImportDecisionSelection> {
  return Object.fromEntries(preview.rows.map((row) => [
    row.rowNumber,
    { rowNumber: row.rowNumber, decision: row.decision, existingPersonId: row.existingPersonId },
  ]));
}

function DecisionSelect({
  row,
  selection,
  matches,
  disabled,
  onChange,
}: {
  row: CsvImportPreviewRow;
  selection: CsvImportDecisionSelection;
  matches: readonly ImportMatchPerson[];
  disabled: boolean;
  onChange: (selection: CsvImportDecisionSelection) => void;
}) {
  if (row.classification === "invalid") {
    return <span className="text-sm font-medium text-slate-500">Skip — fix CSV first</span>;
  }

  return (
    <select
      aria-label={`Decision for row ${row.rowNumber}`}
      className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 disabled:bg-slate-100"
      disabled={disabled}
      onChange={(event) => onChange(parseSelectionValue(row.rowNumber, event.target.value))}
      value={selectionValue(selection)}
    >
      {row.classification === "new" ? <option value="create_new">Create new supporter</option> : null}
      {row.classification === "exact_email_match" && row.existingPersonId ? (
        <option value={`update:${row.existingPersonId}`}>Update {matchLabel(row.existingPersonId, matches)}</option>
      ) : null}
      {row.classification === "ambiguous_phone_match" ? (
        <option value="create_new">Create separate supporter</option>
      ) : null}
      {row.classification === "ambiguous_phone_match" ? row.candidatePersonIds.map((id) => (
        <option key={id} value={`update:${id}`}>Update {matchLabel(id, matches)}</option>
      )) : null}
      <option value="skip">Skip row</option>
    </select>
  );
}

export function CsvImportWizard() {
  const [fileName, setFileName] = useState("");
  const [fileText, setFileText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<CsvColumnMapping>([]);
  const [preview, setPreview] = useState<CsvImportPreview | null>(null);
  const [matches, setMatches] = useState<ImportMatchPerson[]>([]);
  const [selections, setSelections] = useState<Record<number, CsvImportDecisionSelection>>({});
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ imported: number; updated: number; skipped: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const ready = mappingReady(mapping);
  const counts = useMemo(() => {
    const result = { new: 0, exact_email_match: 0, ambiguous_phone_match: 0, invalid: 0 };
    for (const row of preview?.rows ?? []) result[row.classification] += 1;
    return result;
  }, [preview]);
  const pageCount = preview ? Math.max(1, Math.ceil(preview.rows.length / ROWS_PER_PAGE)) : 1;
  const visibleRows = preview?.rows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE) ?? [];

  function resetReview() {
    setPreview(null);
    setMatches([]);
    setSelections({});
    setPage(0);
    setSummary(null);
  }

  async function handleFile(file: File | undefined) {
    resetReview();
    setMessage(null);
    if (!file) {
      setFileName("");
      setFileText("");
      setHeaders([]);
      setMapping([]);
      return;
    }
    if (file.size > CSV_MAX_BYTES) {
      setMessage("CSV import must be 2 MiB or smaller.");
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setFileName(file.name);
      setFileText(text);
      setHeaders(parsed.headers);
      setMapping(guessMapping(parsed.headers));
    } catch (error) {
      setFileName("");
      setFileText("");
      setHeaders([]);
      setMapping([]);
      setMessage(error instanceof Error ? error.message : "Unable to read this CSV file.");
    }
  }

  function updateMapping(index: number, value: string) {
    const next = [...mapping];
    next[index] = value ? value as CanonicalImportField : null;
    setMapping(next);
    resetReview();
  }

  function requestPreview() {
    if (!fileText || !ready) {
      setMessage("Map first name, last name, and at least one email or phone column before previewing.");
      return;
    }
    setMessage(null);
    setSummary(null);
    startTransition(async () => {
      const result = await previewCsvImportAction(fileText, mapping);
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      setPreview(result.preview);
      setMatches(result.matches);
      setSelections(defaultSelections(result.preview));
      setPage(0);
    });
  }

  function applyImport() {
    if (!preview) return;
    setMessage(null);
    setSummary(null);
    const decisions = preview.rows.map((row) => selections[row.rowNumber] ?? {
      rowNumber: row.rowNumber,
      decision: row.decision,
      existingPersonId: row.existingPersonId,
    });

    startTransition(async () => {
      const result = await applyCsvImportAction(fileText, fileName, mapping, decisions);
      if (result.status === "error") {
        setMessage(result.message);
        return;
      }
      setSummary({
        imported: result.summary.imported,
        updated: result.summary.updated,
        skipped: result.summary.skipped,
      });
      setMessage("CSV import applied successfully.");
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">1. Upload CSV</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Maximum 2 MiB and 5,000 data rows. Uploaded contents are used only to perform this import and are not written to audit metadata.</p>
          </div>
          {fileName ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{fileName}</span> : null}
        </div>
        <input
          accept=".csv,text/csv"
          className="mt-4 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2.5 file:font-semibold file:text-white hover:file:bg-slate-700"
          onChange={(event) => void handleFile(event.target.files?.[0])}
          type="file"
        />
      </section>

      {headers.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-950">2. Map columns</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">First name and last name are required. Map at least one contact field: email or phone.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {headers.map((header, index) => {
              const current = mapping[index];
              const selectedElsewhere = new Set(mapping.filter((field, otherIndex) => field && otherIndex !== index));
              return (
                <label className="rounded-xl border border-slate-200 p-3" key={`${header}-${index}`}>
                  <span className="block truncate text-sm font-medium text-slate-800" title={header}>{header || `(Column ${index + 1})`}</span>
                  <select
                    className="mt-2 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
                    onChange={(event) => updateMapping(index, event.target.value)}
                    value={current ?? ""}
                  >
                    <option value="">Ignore column</option>
                    {canonicalImportFields.map((field) => (
                      <option disabled={selectedElsewhere.has(field)} key={field} value={field}>{fieldLabels[field]}</option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!ready || pending}
              onClick={requestPreview}
              type="button"
            >
              {pending ? "Checking records…" : preview ? "Refresh preview" : "Preview import"}
            </button>
          </div>
        </section>
      ) : null}

      {preview ? (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">3. Review rows</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Exact email matches cannot create a duplicate. Possible phone matches default to skip until you make an explicit choice.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs font-medium text-emerald-700">New</p><p className="mt-1 text-xl font-semibold text-emerald-950">{counts.new}</p></div>
            <div className="rounded-xl bg-blue-50 p-3"><p className="text-xs font-medium text-blue-700">Exact email</p><p className="mt-1 text-xl font-semibold text-blue-950">{counts.exact_email_match}</p></div>
            <div className="rounded-xl bg-amber-50 p-3"><p className="text-xs font-medium text-amber-700">Possible match</p><p className="mt-1 text-xl font-semibold text-amber-950">{counts.ambiguous_phone_match}</p></div>
            <div className="rounded-xl bg-red-50 p-3"><p className="text-xs font-medium text-red-700">Invalid</p><p className="mt-1 text-xl font-semibold text-red-950">{counts.invalid}</p></div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">Row</th>
                  <th className="px-3 py-3">Supporter</th>
                  <th className="px-3 py-3">Contact</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((row) => {
                  const selection = selections[row.rowNumber] ?? { rowNumber: row.rowNumber, decision: row.decision, existingPersonId: row.existingPersonId };
                  return (
                    <tr className="align-top" key={row.rowNumber}>
                      <td className="px-3 py-3 font-medium text-slate-500">{row.rowNumber}</td>
                      <td className="px-3 py-3"><p className="font-medium text-slate-950">{row.data.firstName || "—"} {row.data.lastName || ""}</p><p className="mt-1 text-xs text-slate-500">{row.data.zipCode || "No ZIP"}{row.data.municipality ? ` · ${row.data.municipality}` : ""}</p></td>
                      <td className="px-3 py-3 text-slate-700"><p className="break-all">{row.data.email || "—"}</p><p className="mt-1">{row.data.phone || "—"}</p></td>
                      <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${classificationClasses(row.classification)}`}>{classificationLabel(row.classification)}</span>{row.errors.length ? <ul className="mt-2 space-y-1 text-xs text-red-700">{row.errors.map((error) => <li key={error}>{error}</li>)}</ul> : null}</td>
                      <td className="w-72 px-3 py-3"><DecisionSelect disabled={pending || Boolean(summary)} matches={matches} onChange={(next) => setSelections((current) => ({ ...current, [row.rowNumber]: next }))} row={row} selection={selection} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <button className="rounded-lg border border-slate-300 px-3 py-2 font-medium disabled:opacity-40" disabled={page === 0 || pending} onClick={() => setPage((value) => Math.max(0, value - 1))} type="button">Previous</button>
              <span>Page {page + 1} of {pageCount}</span>
              <button className="rounded-lg border border-slate-300 px-3 py-2 font-medium disabled:opacity-40" disabled={page + 1 >= pageCount || pending} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} type="button">Next</button>
            </div>
            <button
              className="min-h-11 rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pending || Boolean(summary)}
              onClick={applyImport}
              type="button"
            >
              {pending ? "Applying import…" : "Apply import"}
            </button>
          </div>
        </section>
      ) : null}

      {message ? (
        <p className={`rounded-xl border p-4 text-sm ${summary ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`} role="status">{message}</p>
      ) : null}

      {summary ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-emerald-950">Import summary</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/70 p-3"><p className="text-xs text-emerald-700">Created</p><p className="mt-1 text-xl font-semibold text-emerald-950">{summary.imported}</p></div>
            <div className="rounded-xl bg-white/70 p-3"><p className="text-xs text-emerald-700">Updated</p><p className="mt-1 text-xl font-semibold text-emerald-950">{summary.updated}</p></div>
            <div className="rounded-xl bg-white/70 p-3"><p className="text-xs text-emerald-700">Skipped</p><p className="mt-1 text-xl font-semibold text-emerald-950">{summary.skipped}</p></div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
