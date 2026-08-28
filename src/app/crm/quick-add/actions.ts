"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffUser } from "@/lib/auth/require-staff";
import {
  getQuickAddMatchReasons,
  prepareQuickAddInput,
  type QuickAddActionState,
  type QuickAddVisibleCandidate,
} from "@/lib/crm/quick-add";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RpcResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
};

type QuickAddRpcClient = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<RpcResult>;
};

type CandidateRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  normalized_email: string | null;
  phone: string | null;
  normalized_phone: string | null;
  zip_code: string | null;
  county_id: string | null;
  county_name: string | null;
};

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function invalidState(): QuickAddActionState {
  return {
    status: "error",
    message: "Enter a first and last name, a valid 5-digit ZIP code, and at least one valid email address or phone number.",
  };
}

async function findCandidates(
  rpcClient: QuickAddRpcClient,
  prepared: NonNullable<ReturnType<typeof prepareQuickAddInput>>,
): Promise<{ candidates: QuickAddVisibleCandidate[]; error: RpcResult["error"] }> {
  const result = await rpcClient.rpc("find_quick_add_candidates", {
    p_first_name: prepared.firstName,
    p_last_name: prepared.lastName,
    p_normalized_email: prepared.normalizedEmail,
    p_normalized_phone: prepared.normalizedPhone,
    p_zip_code: prepared.zipCode,
  });

  if (result.error) {
    return { candidates: [], error: result.error };
  }

  const rows = Array.isArray(result.data) ? (result.data as CandidateRow[]) : [];
  const candidates = rows.map((row) => ({
    id: row.id,
    name: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    phone: row.phone,
    zipCode: row.zip_code,
    countyName: row.county_name,
    matchReasons: getQuickAddMatchReasons(prepared, {
      firstName: row.first_name,
      lastName: row.last_name,
      normalizedEmail: row.normalized_email,
      normalizedPhone: row.normalized_phone,
      zipCode: row.zip_code,
    }),
  }));

  return { candidates, error: null };
}

export async function quickAddAction(formData: FormData): Promise<QuickAddActionState> {
  const staff = await requireStaffUser();
  if (staff.role === "volunteer_staff") {
    return { status: "error", message: "Your role cannot create new supporter records." };
  }

  const prepared = prepareQuickAddInput({
    firstName: readString(formData, "firstName"),
    lastName: readString(formData, "lastName"),
    email: readString(formData, "email"),
    phone: readString(formData, "phone"),
    zipCode: readString(formData, "zipCode"),
  });
  if (!prepared) return invalidState();

  const supabase = await createServerSupabaseClient();
  const rpcClient = supabase as unknown as QuickAddRpcClient;
  const { candidates, error: candidateError } = await findCandidates(rpcClient, prepared);
  if (candidateError) {
    return { status: "error", message: "Unable to check for existing contacts right now." };
  }

  const hasExactEmail = candidates.some((candidate) => candidate.matchReasons.includes("email"));
  const createAnyway = readString(formData, "intent") === "create-anyway";
  if (candidates.length > 0 && (!createAnyway || hasExactEmail)) {
    return {
      status: "duplicate",
      message: hasExactEmail
        ? "A visible contact already uses this email address. Open that profile instead of creating a duplicate."
        : "Possible existing contacts were found. Review them before creating a new record.",
      candidates,
      canCreateAnyway: !hasExactEmail,
    };
  }

  const created = await rpcClient.rpc("create_quick_add_person", {
    p_first_name: prepared.firstName,
    p_last_name: prepared.lastName,
    p_email: prepared.email,
    p_normalized_email: prepared.normalizedEmail,
    p_phone: prepared.phone,
    p_normalized_phone: prepared.normalizedPhone,
    p_zip_code: prepared.zipCode,
    p_county_name: prepared.countyName,
    p_municipality: prepared.municipality,
  });

  if (created.error) {
    if (created.error.code === "23505") {
      return {
        status: "error",
        message: "This contact cannot be created because that email address is already in use.",
      };
    }
    if (created.error.code === "42501") {
      return {
        status: "error",
        message: "Your account does not have permission to create this contact in that organizing area.",
      };
    }
    return { status: "error", message: "Unable to create this supporter right now." };
  }

  if (typeof created.data !== "string") {
    return { status: "error", message: "The supporter was created but the profile could not be opened." };
  }

  revalidatePath("/crm");
  revalidatePath("/crm/people");
  redirect(`/crm/people/${created.data}`);
}
