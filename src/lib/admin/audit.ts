import type { Database, Json } from "@/lib/supabase/database.types";

export const ADMIN_AUDIT_PAGE_SIZE = 50;

type AdminAuditRow = Database["public"]["Tables"]["admin_audit_events"]["Row"];

export type AdminAuditEvent = AdminAuditRow & {
  actorDisplayName: string;
};

export type AdminAuditPage = {
  events: AdminAuditEvent[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type AuditMetadataSummary = {
  label: string;
  value: string;
};

const SAFE_METADATA_KEYS = [
  "role",
  "from",
  "to",
  "county_count",
  "from_count",
  "to_count",
  "taxonomy",
  "active",
  "category",
  "person_a_id",
  "person_b_id",
  "candidate_id",
  "merged_person_id",
  "batch_id",
  "row_count",
  "imported_count",
  "updated_count",
  "skipped_count",
  "active_filter_keys",
] as const;

function humanize(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.toLowerCase() === "csv"
      ? "CSV"
      : `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function metadataValue(value: Json | undefined): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const values = value.filter(
      (entry): entry is string | number | boolean =>
        typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean",
    );
    return values.length === value.length ? values.map(String).join(", ") : null;
  }
  return null;
}

export function parseAuditPage(value: string | string[] | undefined): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !/^\d+$/.test(candidate)) return 1;
  const parsed = Number(candidate);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 100000 ? parsed : 1;
}

export function formatAuditAction(actionType: string): string {
  return humanize(actionType);
}

export function summarizeAuditMetadata(metadata: Json): AuditMetadataSummary[] {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") return [];

  const summaries: AuditMetadataSummary[] = [];
  for (const key of SAFE_METADATA_KEYS) {
    const value = metadataValue(metadata[key]);
    if (value === null) continue;
    summaries.push({ label: humanize(key), value });
  }
  return summaries;
}

export async function loadAdminAuditPage(page: number): Promise<AdminAuditPage> {
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const from = (page - 1) * ADMIN_AUDIT_PAGE_SIZE;
  const to = from + ADMIN_AUDIT_PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from("admin_audit_events")
    .select(
      "id, actor_staff_user_id, action_type, target_type, target_id, metadata, occurred_at",
      { count: "exact" },
    )
    .order("occurred_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error("Unable to load the administration audit log.");

  const events = data ?? [];
  const actorIds = [...new Set(events.map((event) => event.actor_staff_user_id))];
  const actorNames = new Map<string, string>();

  if (actorIds.length > 0) {
    const actorResult = await supabase
      .from("staff_users")
      .select("id, display_name")
      .in("id", actorIds);

    if (actorResult.error) throw new Error("Unable to load the administration audit log.");
    for (const actor of actorResult.data ?? []) {
      actorNames.set(actor.id, actor.display_name);
    }
  }

  const totalCount = count ?? events.length;
  return {
    events: events.map((event) => ({
      ...event,
      actorDisplayName: actorNames.get(event.actor_staff_user_id) ?? "Former or unavailable staff",
    })),
    page,
    pageSize: ADMIN_AUDIT_PAGE_SIZE,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / ADMIN_AUDIT_PAGE_SIZE)),
  };
}
