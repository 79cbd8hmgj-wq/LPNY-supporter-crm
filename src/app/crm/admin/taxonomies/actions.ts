"use server";

import { revalidatePath } from "next/cache";
import { requireStaffRole } from "@/lib/auth/require-role";
import {
  createInterestSchema,
  createSourceSchema,
  createTagSchema,
  toTaxonomySlug,
  updateInterestSchema,
  updateSourceSchema,
  updateTagSchema,
  type TaxonomyActionResult,
} from "@/lib/admin/taxonomies";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RpcResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
};

type TaxonomyRpcClient = {
  rpc(name: "manage_interest" | "manage_tag" | "manage_source", args: Record<string, unknown>): PromiseLike<RpcResult>;
};

function errorResult(error: RpcResult["error"]): TaxonomyActionResult {
  if (error?.code === "42501") {
    return { status: "error", message: "Your account does not have permission to manage shared CRM taxonomy values." };
  }
  if (error?.code === "23505") {
    return { status: "error", message: "A taxonomy value with that name or slug already exists." };
  }
  return { status: "error", message: "Unable to save this taxonomy value right now." };
}

async function rpcClient(): Promise<TaxonomyRpcClient> {
  const supabase = await createServerSupabaseClient();
  return supabase as unknown as TaxonomyRpcClient;
}

export async function saveInterest(input: {
  id?: string | null;
  name: string;
  active: boolean;
}): Promise<TaxonomyActionResult> {
  await requireStaffRole(["admin", "state_organizer"]);
  const parsed = input.id
    ? updateInterestSchema.safeParse({ id: input.id, name: input.name, active: input.active })
    : createInterestSchema.safeParse({ name: input.name, active: input.active });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Enter a valid interest." };
  }

  const slug = toTaxonomySlug(parsed.data.name);
  if (!input.id && !slug) {
    return { status: "error", message: "Enter an interest name that can produce a stable CRM slug." };
  }

  const result = await (await rpcClient()).rpc("manage_interest", {
    p_interest_id: input.id ?? null,
    p_name: parsed.data.name,
    p_slug: slug,
    p_active: parsed.data.active,
  });
  if (result.error) return errorResult(result.error);

  revalidatePath("/crm/admin/taxonomies");
  return { status: "success", message: input.id ? "Interest updated." : "Interest created." };
}

export async function saveTag(input: {
  id?: string | null;
  name: string;
  active: boolean;
}): Promise<TaxonomyActionResult> {
  await requireStaffRole(["admin", "state_organizer"]);
  const parsed = input.id
    ? updateTagSchema.safeParse({ id: input.id, name: input.name, active: input.active })
    : createTagSchema.safeParse({ name: input.name, active: input.active });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Enter a valid tag." };
  }

  const result = await (await rpcClient()).rpc("manage_tag", {
    p_tag_id: input.id ?? null,
    p_name: parsed.data.name,
    p_active: parsed.data.active,
  });
  if (result.error) return errorResult(result.error);

  revalidatePath("/crm/admin/taxonomies");
  return { status: "success", message: input.id ? "Tag updated." : "Tag created." };
}

export async function saveSource(input: {
  id?: string | null;
  name: string;
  category: string;
  active: boolean;
}): Promise<TaxonomyActionResult> {
  await requireStaffRole(["admin", "state_organizer"]);
  const parsed = input.id
    ? updateSourceSchema.safeParse({ id: input.id, name: input.name, category: input.category, active: input.active })
    : createSourceSchema.safeParse({ name: input.name, category: input.category, active: input.active });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Enter a valid source." };
  }

  const slug = toTaxonomySlug(parsed.data.name);
  if (!input.id && !slug) {
    return { status: "error", message: "Enter a source name that can produce a stable CRM slug." };
  }

  const result = await (await rpcClient()).rpc("manage_source", {
    p_source_id: input.id ?? null,
    p_name: parsed.data.name,
    p_slug: slug,
    p_category: parsed.data.category,
    p_active: parsed.data.active,
  });
  if (result.error) return errorResult(result.error);

  revalidatePath("/crm/admin/taxonomies");
  return { status: "success", message: input.id ? "Source updated." : "Source created." };
}
