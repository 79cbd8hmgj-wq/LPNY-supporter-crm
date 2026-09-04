"use client";

import { useActionState } from "react";
import {
  supporterProfileInitialState,
  updateSupporterProfileAction,
} from "./profile-actions";

type Profile = {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  zip_code: string | null;
  municipality: string | null;
  county_name: string | null;
  email_opt_in: boolean;
  sms_opt_in: boolean;
  phone_opt_in: boolean;
};

type Interest = {
  slug: string;
  name: string;
  selected: boolean;
};

const inputClass =
  "mt-1 min-h-11 w-full rounded-lg border border-lp-300 bg-white px-3 py-2 text-base text-lp-950";

export function SupporterProfileForm({
  profile,
  interests,
}: {
  profile: Profile;
  interests: Interest[];
}) {
  const [state, action, pending] = useActionState(
    updateSupporterProfileAction,
    supporterProfileInitialState,
  );

  return (
    <form action={action} className="mt-5 space-y-5">
      {state.message ? (
        <p
          className={`rounded-lg p-3 text-sm ${
            state.status === "error"
              ? "bg-red-50 text-red-800"
              : "bg-emerald-50 text-emerald-800"
          }`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          First name
          <input className={inputClass} defaultValue={profile.first_name} maxLength={80} name="firstName" required />
        </label>
        <label className="text-sm font-medium">
          Last name
          <input className={inputClass} defaultValue={profile.last_name} maxLength={80} name="lastName" required />
        </label>
      </div>

      <label className="block text-sm font-medium">
        Email
        <input className={`${inputClass} bg-lp-50 text-lp-600`} disabled value={profile.email ?? ""} />
        <span className="mt-1 block text-xs font-normal text-lp-500">
          Email changes require a new verification flow and are not editable here yet.
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Phone
          <input className={inputClass} defaultValue={profile.phone ?? ""} inputMode="tel" name="phone" type="tel" />
        </label>
        <label className="text-sm font-medium">
          ZIP code
          <input className={inputClass} defaultValue={profile.zip_code ?? ""} inputMode="numeric" maxLength={5} name="zipCode" required />
        </label>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">Interests</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {interests.map((interest) => (
            <label
              className="flex min-h-11 items-center gap-3 rounded-lg border border-lp-200 px-3 py-2"
              key={interest.slug}
            >
              <input
                defaultChecked={interest.selected}
                name="interests"
                type="checkbox"
                value={interest.slug}
              />
              <span>{interest.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Communication preferences</legend>
        <label className="flex items-start gap-3">
          <input defaultChecked={profile.email_opt_in} name="emailOptIn" type="checkbox" />
          <span className="text-sm">Send me LPNY email updates.</span>
        </label>
        <label className="flex items-start gap-3">
          <input defaultChecked={profile.sms_opt_in || profile.phone_opt_in} name="phoneOptIn" type="checkbox" />
          <span className="text-sm">LPNY may call or text me about organizing opportunities.</span>
        </label>
      </fieldset>

      <button
        className="min-h-11 rounded-lg bg-lp-navy px-4 py-2 font-semibold text-white disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>

      <p className="text-xs leading-5 text-lp-500">
        Internal organizer notes, tags, assignments, tasks, and engagement status are never exposed here.
      </p>
    </form>
  );
}
