"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useState, useTransition } from "react";
import type {
  QuickAddActionState,
  QuickAddMatchReason,
} from "@/lib/crm/quick-add";
import { quickAddAction } from "./actions";

const initialState: QuickAddActionState = { status: "idle" };
const inputClass = "mt-1 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-200";

const reasonLabels: Record<QuickAddMatchReason, string> = {
  email: "Same email",
  phone: "Same phone",
  name_zip: "Same name + ZIP",
};

export function QuickAddForm() {
  const [state, setState] = useState<QuickAddActionState>(initialState);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (submitter instanceof HTMLButtonElement && submitter.value) {
      formData.set("intent", submitter.value);
    }

    startTransition(async () => {
      const nextState = await quickAddAction(formData);
      setState(nextState);
    });
  }

  return (
    <form className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" onSubmit={submit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="firstName" label="First name">
          <input className={inputClass} id="firstName" name="firstName" autoComplete="given-name" required />
        </Field>
        <Field id="lastName" label="Last name">
          <input className={inputClass} id="lastName" name="lastName" autoComplete="family-name" required />
        </Field>
      </div>

      <Field id="email" label="Email" hint="Email or phone is required">
        <input className={inputClass} id="email" name="email" type="email" autoComplete="email" inputMode="email" />
      </Field>

      <Field id="phone" label="Phone" hint="Email or phone is required">
        <input className={inputClass} id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" />
      </Field>

      <Field id="zipCode" label="ZIP code" hint="Used to route the initial follow-up queue">
        <input className={inputClass} id="zipCode" name="zipCode" autoComplete="postal-code" inputMode="numeric" maxLength={5} pattern="[0-9]{5}" required />
      </Field>

      {state.status === "error" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.status === "duplicate" ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4" aria-live="polite">
          <h2 className="font-semibold text-amber-950">Possible existing contact</h2>
          <p className="mt-1 text-sm leading-6 text-amber-900">{state.message}</p>
          <div className="mt-3 space-y-2">
            {state.candidates.map((candidate) => (
              <article key={candidate.id} className="rounded-lg border border-amber-200 bg-white p-3 text-sm">
                <Link className="font-semibold text-slate-950 hover:underline" href={`/crm/people/${candidate.id}`}>
                  {candidate.name}
                </Link>
                <div className="mt-1 text-slate-600">
                  {candidate.email ?? candidate.phone ?? "No contact information"}
                  {candidate.countyName ? ` · ${candidate.countyName} County` : ""}
                  {candidate.zipCode ? ` · ${candidate.zipCode}` : ""}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {candidate.matchReasons.map((reason) => (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900" key={reason}>
                      {reasonLabels[reason]}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
          {state.canCreateAnyway ? (
            <button
              className="mt-4 min-h-12 w-full rounded-lg border border-amber-700 px-4 py-2 font-semibold text-amber-950 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              disabled={pending}
              name="intent"
              type="submit"
              value="create-anyway"
            >
              {pending ? "Creating…" : "Create new record anyway"}
            </button>
          ) : null}
        </section>
      ) : null}

      <button
        className="min-h-12 w-full rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        disabled={pending}
        name="intent"
        type="submit"
        value="check"
      >
        {pending ? "Checking…" : "Add supporter"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="font-medium text-slate-900" htmlFor={id}>{label}</label>
      {children}
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}
