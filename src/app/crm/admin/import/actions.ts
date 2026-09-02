"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaffRole } from "@/lib/auth/require-role";
import {
  buildCsvImportApplyRows,
  previewCsvImport,
  type CsvColumnMapping,
  type CsvImportDecisionSelection,
  type CsvImportPreview,
  type ImportMatchPerson,
} from "@/lib/admin/import-preview";
import { CSV_MAX_DATA_ROWS } from "@/lib/admin/csv";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const decisionSelectionSchema = z.array(z.object({
  rowNumber: z.number().int().min(2).max(CSV_MAX_DATA_ROWS + 1),
  decision: z.enum(["create_new", "update_existing", "skip"]),
  existingPersonId: z.string().uuid().nullable(),
})).max(CSV_MAX_DATA_ROWS);

const importSummarySchema = z.object({
  batch_id: z.string().uuid(),
  row_count: z.number().int().nonnegative(),
  imported: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});

type ImportRpcError = { code?: string; message?: string } | null;
type ImportMatchRow = {
  id: string;
  first_name: string;
  last_name: string;
  normalized_email: string | null;
  normalized_phone: string | null;
};

type ImportRpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: ImportRpcError }>;
};

function asImportRpcClient(client: Awaited<ReturnType<typeof createServerSupabaseClient>>): ImportRpcClient {
  return client as unknown as ImportRpcClient;
}

function uniqueContacts(preview: CsvImportPreview) {
  const emails = new Set<string>();
  const phones = new Set<string>();
  for (const row of preview.rows) {
    if (row.data.normalizedEmail) emails.add(row.data.normalizedEmail);
    if (row.data.normalizedPhone) phones.add(row.data.normalizedPhone);
  }
  return { emails: [...emails], phones: [...phones] };
}

async function buildServerImportPreview(
  fileText: string,
  mapping: CsvColumnMapping,
): Promise<{ preview: CsvImportPreview; matches: ImportMatchPerson[] }> {
  const initialPreview = previewCsvImport(fileText, mapping, []);
  const contacts = uniqueContacts(initialPreview);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await asImportRpcClient(supabase).rpc("admin_find_csv_import_matches", {
    p_normalized_emails: contacts.emails,
    p_normalized_phones: contacts.phones,
  });

  if (error) {
    const failure = new Error("Unable to check the CSV against current supporter records.") as Error & { code?: string };
    failure.code = error.code;
    throw failure;
  }

  const rows = z.array(z.object({
    id: z.string().uuid(),
    first_name: z.string(),
    last_name: z.string(),
    normalized_email: z.string().nullable(),
    normalized_phone: z.string().nullable(),
  })).parse(data ?? []) as ImportMatchRow[];

  const matches = rows.map((row): ImportMatchPerson => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    normalizedEmail: row.normalized_email,
    normalizedPhone: row.normalized_phone,
  }));

  return {
    preview: previewCsvImport(fileText, mapping, matches),
    matches,
  };
}

function safePreviewError(error: unknown): string {
  if (error instanceof Error && /^(CSV|Malformed CSV)/.test(error.message)) return error.message;
  if (error instanceof Error && /mapped|mapping/i.test(error.message)) return error.message;
  return "Unable to preview this CSV right now.";
}

export async function previewCsvImportAction(fileText: string, mapping: CsvColumnMapping) {
  await requireStaffRole(["admin"]);

  try {
    const result = await buildServerImportPreview(fileText, mapping);
    return { status: "success" as const, ...result };
  } catch (error) {
    return { status: "error" as const, message: safePreviewError(error) };
  }
}

export async function applyCsvImportAction(
  fileText: string,
  filename: string,
  mapping: CsvColumnMapping,
  selections: readonly CsvImportDecisionSelection[],
) {
  await requireStaffRole(["admin"]);

  const trimmedFilename = filename.trim();
  if (!trimmedFilename || trimmedFilename.length > 255) {
    return { status: "error" as const, message: "Choose a CSV file with a valid filename." };
  }

  const parsedSelections = decisionSelectionSchema.safeParse(selections);
  if (!parsedSelections.success) {
    return { status: "error" as const, message: "The import decisions are invalid. Preview the CSV again." };
  }

  try {
    const { preview } = await buildServerImportPreview(fileText, mapping);
    const rows = buildCsvImportApplyRows(preview, parsedSelections.data);
    const supabase = await createServerSupabaseClient();
    const { data, error } = await asImportRpcClient(supabase).rpc("apply_csv_import", {
      p_filename: trimmedFilename,
      p_rows: rows,
    });

    if (error) {
      if (error.code === "42501") {
        return { status: "error" as const, message: "Your account does not have permission to import supporter data." };
      }
      if (error.code === "23505") {
        return { status: "error" as const, message: "A supporter with one of these email addresses now exists. Preview the CSV again before applying it." };
      }
      if (error.code === "22023") {
        return { status: "error" as const, message: "The CSV no longer matches current CRM configuration. Preview it again and review the affected rows." };
      }
      return { status: "error" as const, message: "Unable to apply the CSV import right now." };
    }

    const summary = importSummarySchema.safeParse(data);
    if (!summary.success) {
      return { status: "error" as const, message: "The import completed but its summary could not be verified. Check the audit log before retrying." };
    }

    revalidatePath("/crm/people");
    revalidatePath("/crm/admin/import");

    return { status: "success" as const, summary: summary.data };
  } catch (error) {
    if (error instanceof Error && /CSV row|Exact-email|Invalid CSV|New CSV/i.test(error.message)) {
      return { status: "error" as const, message: `${error.message}. Preview the CSV again before applying it.` };
    }
    return { status: "error" as const, message: safePreviewError(error) };
  }
}
