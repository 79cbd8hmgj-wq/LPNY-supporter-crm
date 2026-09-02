import { requireStaffRole } from "@/lib/auth/require-role";
import {
  activeExportFilterKeys,
  buildPeopleExportRows,
  serializePeopleExportCsv,
} from "@/lib/admin/export";
import { parsePeopleFilters } from "@/lib/crm/people-filters";
import { readPeopleSearchQuery } from "@/lib/crm/people-search-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ExportAuditRpcError = { code?: string; message?: string } | null;
type ExportAuditRpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: ExportAuditRpcError }>;
};

function asExportAuditRpcClient(
  client: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): ExportAuditRpcClient {
  return client as unknown as ExportAuditRpcClient;
}

function newYorkDateStamp(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function GET(request: Request) {
  await requireStaffRole(["admin"]);

  try {
    const searchParams = new URL(request.url).searchParams;
    const structuredFilters = parsePeopleFilters(searchParams);
    const query = await readPeopleSearchQuery(searchParams.get("search") === "1");
    const exportFilters = { ...structuredFilters, query, page: 1 };
    const rows = await buildPeopleExportRows(exportFilters);
    const supabase = await createServerSupabaseClient();
    const { error } = await asExportAuditRpcClient(supabase).rpc(
      "admin_record_people_csv_export",
      {
        p_row_count: rows.length,
        p_active_filter_keys: activeExportFilterKeys(exportFilters),
      },
    );

    if (error) {
      return new Response("Unable to record the export audit event.", { status: 500 });
    }

    return new Response(serializePeopleExportCsv(rows), {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="lpny-supporters-${newYorkDateStamp()}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Unable to export supporter data right now.", { status: 500 });
  }
}
