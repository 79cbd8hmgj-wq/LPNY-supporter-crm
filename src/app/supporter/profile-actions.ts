"use server";

import { revalidatePath } from "next/cache";
import { requireSupporter } from "@/lib/auth/require-supporter";
import { prepareSupporterProfileInput } from "@/lib/supporter/profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SupporterProfileActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

export async function updateSupporterProfileAction(
  _previous: SupporterProfileActionState,
  formData: FormData,
): Promise<SupporterProfileActionState> {
  await requireSupporter();

  const prepared = prepareSupporterProfileInput({
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    zipCode: String(formData.get("zipCode") ?? ""),
    interestSlugs: formData.getAll("interests").map(String),
    emailOptIn: checked(formData, "emailOptIn"),
    phoneOptIn: checked(formData, "phoneOptIn"),
  });

  if (!prepared) {
    return {
      status: "error",
      message: "Check your name, phone number, ZIP code, interests, and contact preferences.",
    };
  }

  const supabase = await createServerSupabaseClient();
  let countyId: string | null = null;

  if (prepared.countyName) {
    const { data: county, error: countyError } = await supabase
      .from("counties")
      .select("id")
      .eq("name", prepared.countyName)
      .maybeSingle();

    if (countyError || !county) {
      return {
        status: "error",
        message: "We could not match that ZIP code to an organizing county.",
      };
    }
    countyId = county.id;
  }

  const { error } = await supabase.rpc("update_my_supporter_profile", {
    p_first_name: prepared.firstName,
    p_last_name: prepared.lastName,
    p_phone: prepared.phone,
    p_normalized_phone: prepared.normalizedPhone,
    p_zip_code: prepared.zipCode,
    p_county_id: countyId,
    p_municipality: prepared.municipality,
    p_interest_slugs: prepared.interestSlugs,
    p_email_opt_in: prepared.emailOptIn,
    p_phone_opt_in: prepared.phoneOptIn,
  });

  if (error) {
    return {
      status: "error",
      message: "Your profile could not be updated. Please check your information and try again.",
    };
  }

  revalidatePath("/supporter");
  return { status: "success", message: "Your profile has been updated." };
}
