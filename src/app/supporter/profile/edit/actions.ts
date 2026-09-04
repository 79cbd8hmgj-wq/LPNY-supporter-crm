"use server";

import { revalidatePath } from "next/cache";
import { requireSupporter } from "@/lib/auth/require-supporter";
import { prepareSupporterProfileInput } from "@/lib/supporter/profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SupporterProfileActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export const supporterProfileInitialState: SupporterProfileActionState = {
  status: "idle",
  message: "",
};

export async function updateSupporterProfileAction(
  _previous: SupporterProfileActionState,
  formData: FormData,
): Promise<SupporterProfileActionState> {
  await requireSupporter();

  const input = prepareSupporterProfileInput({
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    zipCode: String(formData.get("zipCode") ?? ""),
    interestSlugs: formData
      .getAll("interests")
      .filter((value): value is string => typeof value === "string"),
    emailOptIn: formData.get("emailOptIn") === "on",
    phoneOptIn: formData.get("phoneOptIn") === "on",
  });

  if (!input) {
    return {
      status: "error",
      message: "Check your name, phone number, ZIP code, interests, and contact preferences.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: interestOptions, error: interestError } = await supabase.rpc(
    "list_supporter_interests",
  );

  if (interestError) {
    return { status: "error", message: "Your profile could not be updated. Please try again." };
  }

  const allowedInterests = new Set((interestOptions ?? []).map((interest) => interest.slug));
  if (input.interestSlugs.some((slug) => !allowedInterests.has(slug))) {
    return { status: "error", message: "One of the selected interests is no longer available." };
  }

  let countyId: string | null = null;
  if (input.countyName) {
    const { data: county, error: countyError } = await supabase
      .from("counties")
      .select("id")
      .eq("name", input.countyName)
      .maybeSingle();

    if (countyError || !county) {
      return { status: "error", message: "Your ZIP code could not be matched to an organizing area." };
    }

    countyId = county.id;
  }

  const { error } = await supabase.rpc("update_my_supporter_profile", {
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_phone: input.phone,
    p_normalized_phone: input.normalizedPhone,
    p_zip_code: input.zipCode,
    p_county_id: countyId,
    p_municipality: input.municipality,
    p_interest_slugs: input.interestSlugs,
    p_email_opt_in: input.emailOptIn,
    p_phone_opt_in: input.phoneOptIn,
  });

  if (error) {
    return { status: "error", message: "Your profile could not be updated. Please try again." };
  }

  revalidatePath("/supporter");
  revalidatePath("/supporter/profile/edit");
  return { status: "success", message: "Profile updated." };
}
