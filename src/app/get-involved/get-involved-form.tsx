"use client";

import { FormEvent, useState } from "react";
import { readGetInvolvedForm } from "@/lib/intake/browser-form";

const interests = [
  ["volunteering", "Volunteering"],
  ["local-activism", "Local activism"],
  ["campaign-work", "Campaign work"],
  ["running-for-office", "Running for office"],
  ["events", "Events"],
  ["outreach", "Outreach"],
  ["communications", "Communications"],
  ["data-research", "Data / research"],
  ["other", "Other"],
] as const;

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zipCode: string;
  interests: string[];
  emailOptIn: boolean;
  phoneOptIn: boolean;
  website: string;
};

type FieldErrors = Record<string, string[] | undefined>;

const initialState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  zipCode: "",
  interests: [],
  emailOptIn: false,
  phoneOptIn: false,
  website: "",
};

const inputClass = "mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-200";

export function GetInvolvedForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [success, setSuccess] = useState(false);

  function setValue<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function toggleInterest(slug: string) {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(slug)
        ? current.interests.filter((interest) => interest !== slug)
        : [...current.interests, slug],
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submission = readGetInvolvedForm(event.currentTarget);
    setSubmitting(true);
    setServerError(false);
    setErrors({});

    try {
      const response = await fetch("/api/intake/get-involved", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(submission),
      });
      const payload = (await response.json()) as { ok?: boolean; errors?: FieldErrors };

      if (response.status === 400) {
        setErrors(payload.errors ?? {});
        return;
      }
      if (!response.ok || !payload.ok) {
        setServerError(true);
        return;
      }
      setSuccess(true);
    } catch {
      setServerError(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" aria-live="polite">
        <h2 className="text-xl font-semibold">Thanks for getting involved.</h2>
        <p className="mt-2 leading-7 text-slate-600">
          We received your information. An organizer may follow up with you about ways to participate.
        </p>
      </section>
    );
  }

  return (
    <form className="mt-8 space-y-7 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" onSubmit={submit} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" error={errors.firstName?.[0]}>
          <input className={inputClass} id="firstName" name="firstName" autoComplete="given-name" value={form.firstName} onChange={(event) => setValue("firstName", event.target.value)} />
        </Field>
        <Field label="Last name" error={errors.lastName?.[0]}>
          <input className={inputClass} id="lastName" name="lastName" autoComplete="family-name" value={form.lastName} onChange={(event) => setValue("lastName", event.target.value)} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" hint="Email or phone is required" error={errors.email?.[0]}>
          <input className={inputClass} id="email" name="email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={(event) => setValue("email", event.target.value)} />
        </Field>
        <Field label="Phone" hint="Email or phone is required" error={errors.phone?.[0]}>
          <input className={inputClass} id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(event) => setValue("phone", event.target.value)} />
        </Field>
      </div>

      <Field label="ZIP code" hint="Used to connect you with the right organizing area" error={errors.zipCode?.[0]}>
        <input className={`${inputClass} sm:max-w-48`} id="zipCode" name="zipCode" autoComplete="postal-code" inputMode="numeric" maxLength={5} value={form.zipCode} onChange={(event) => setValue("zipCode", event.target.value.replace(/\D/g, "").slice(0, 5))} />
      </Field>

      <fieldset>
        <legend className="font-medium text-slate-900">What are you interested in?</legend>
        <p className="mt-1 text-sm text-slate-500">Choose any that apply. You can change these later.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {interests.map(([slug, label]) => (
            <label key={slug} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50">
              <input className="h-5 w-5" type="checkbox" name="interests" value={slug} checked={form.interests.includes(slug)} onChange={() => toggleInterest(slug)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {(form.email.trim() || form.phone.trim()) && (
        <fieldset className="space-y-3">
          <legend className="font-medium text-slate-900">Contact preferences</legend>
          {form.email.trim() && (
            <label className="flex cursor-pointer items-start gap-3">
              <input className="mt-1 h-5 w-5" type="checkbox" name="emailOptIn" checked={form.emailOptIn} onChange={(event) => setValue("emailOptIn", event.target.checked)} />
              <span>Yes, I want to receive LPNY email updates.</span>
            </label>
          )}
          {form.phone.trim() && (
            <label className="flex cursor-pointer items-start gap-3">
              <input className="mt-1 h-5 w-5" type="checkbox" name="phoneOptIn" checked={form.phoneOptIn} onChange={(event) => setValue("phoneOptIn", event.target.checked)} />
              <span>Yes, LPNY may call or text me about organizing opportunities.</span>
            </label>
          )}
        </fieldset>
      )}

      <div className="absolute -left-[10000px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => setValue("website", event.target.value)} />
      </div>

      {serverError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">We could not submit the form. Please try again.</p>}

      <button className="min-h-12 w-full rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto" type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Get involved"}
      </button>
    </form>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  const id = label === "First name" ? "firstName" : label === "Last name" ? "lastName" : label.toLowerCase().startsWith("zip") ? "zipCode" : label.toLowerCase();
  return (
    <div>
      <label className="font-medium text-slate-900" htmlFor={id}>{label}</label>
      {children}
      {error ? <p className="mt-1 text-sm text-red-700" role="alert">{error}</p> : hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}
