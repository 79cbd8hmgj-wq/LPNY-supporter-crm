"use client";

import { useActionState } from "react";
import {
  supporterProfileInitialState,
  updateSupporterProfileAction,
} from "./actions";

const inputClass =
  "mt-1 min-h-12 w-full rounded-lg border border-lp-300 bg-white px-3 py-2 text-base text-lp-950 outline-none transition focus:border-lp-700 focus:ring-2 focus:ring-lp-200";

export type SupporterInterestOption = {
  slug: string;
  name: string;
  selected: boolean;
};

export function SupporterProfileForm({
  profile,
  interests,
}: {
  profile: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    zipCode: string | null;
    emailOptIn: boolean;
    phoneOptIn: boolean;
  };
  interests: SupporterInterestOption[];
}) {
  const [state, action, pending] = useActionState(
    updateSupporterProfileAction,
    supporterProfileInitialState,
  );

  return (
    <form action={action} className="mt-6 space-y-6 rounded-xl border border-lp-200 bg-white p-5 shadow-sm sm:p-7">
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

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block font-medium">
          First name
          <input
            className={inputClass}
            defaultValue={profile.firstName}
            maxLength={80}
            name="firstName"
            required
          />
        </label>
        <label className="block font-medium">
          Last name
          <input
            className={inputClass}
            defaultValue={profile.lastName}
            maxLength={80}
            name="lastName"
            required
          />
        </label>
      </div>

      <div>
        <div className="font-medium">Email</div>
        <div className="mt-1 rounded-lg border border-lp-200 bg-lp-50 px-3 py-3 text-lp-700">
          {profile.email ?? "Not provided"}
        </div>
        <p className="mt-1 text-sm text-lp-500">
          Your email is also your supporter sign-in identity, so it cannot be changed here yet.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block font-medium">
          Phone
          <input
            autoComplete="tel"
            className={inputClass}
            defaultValue={profile.phone ?? ""}
            inputMode="tel"
            name="phone"
            type="tel"
          />
        </label>
        <label className="block font-medium">
          ZIP code
          <input
            autoComplete="postal-code"
            className={inputClass}
            defaultValue={profile.zipCode ?? ""}
            inputMode="numeric"
            maxLength={5}
            name="zipCode"
            pattern="[0-9]{5}"
            required
          />
        </label>
      </div>

      <fieldset>
        <legend className="font-medium">Your interests</legend>
        <p className="mt-1 text-sm text-lp-500">Choose any that apply.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {interests.map((interest) => (
            <label
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-lp-200 px-3 py-2 hover:bg-lp-50"
              key={interest.slug}
            >
              <input
                className="h-5 w-5"
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
        <legend className="font-medium">Communication preferences</legend>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            className="mt-1 h-5 w-5"
            defaultChecked={profile.emailOptIn}
            name="emailOptIn"
            type="checkbox"
          />
          <span>Yes, I want to receive LPNY email updates.</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            className="mt-1 h-5 w-5"
            defaultChecked={profile.phoneOptIn}
            name="phoneOptIn"
            type="checkbox"
          />
          <span>Yes, LPNY may call or text me about organizing opportunities.</span>
        </label>
        <p className="text-sm text-lp-500">
          A phone number is required to enable call/text updates.
        </p>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <button
          className="min-h-12 rounded-lg bg-lp-navy px-5 py-3 font-semibold text-white disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <a
          className="inline-flex min-h-12 items-center rounded-lg border border-lp-300 px-5 py-3 font-medium"
          href="/supporter"
        >
          Back to portal
        </a>
      </div>
    </form>
  );
}
