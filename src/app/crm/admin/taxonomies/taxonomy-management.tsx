"use client";

import { type FormEvent, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  InterestAdminRecord,
  SourceAdminRecord,
  TagAdminRecord,
  TaxonomyActionResult,
} from "@/lib/admin/taxonomies";
import { saveInterest, saveSource, saveTag } from "./actions";

const inputClass = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-200";
const subscribeToHydration = () => () => {};

function useHydrated() {
  return useSyncExternalStore(subscribeToHydration, () => true, () => false);
}

function ResultMessage({ result }: { result: TaxonomyActionResult | null }) {
  if (!result) return null;
  const className = result.status === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-red-200 bg-red-50 text-red-800";
  return <p className={`rounded-lg border p-3 text-sm ${className}`} role="status">{result.message}</p>;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`w-fit rounded-full px-2 py-1 text-xs font-medium ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function ActiveToggle({ active, onChange, disabled }: { active: boolean; onChange: (active: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800">
      <input checked={active} disabled={disabled} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      Active in CRM selectors
    </label>
  );
}

function InterestCreateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [result, setResult] = useState<TaxonomyActionResult | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      const next = await saveInterest({ name, active: true });
      setResult(next);
      if (next.status === "success") {
        setName("");
        router.refresh();
      }
    });
  }

  return (
    <form className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" onSubmit={submit}>
      <label className="text-sm font-medium text-slate-800">
        New interest
        <input className={inputClass} maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="Example: Housing reform" required value={name} />
      </label>
      <button className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Adding…" : "Add interest"}
      </button>
      <div className="sm:col-span-2"><ResultMessage result={result} /></div>
    </form>
  );
}

function InterestEditor({ record }: { record: InterestAdminRecord }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(record.name);
  const [active, setActive] = useState(record.active);
  const [result, setResult] = useState<TaxonomyActionResult | null>(null);

  function save() {
    setResult(null);
    startTransition(async () => {
      const next = await saveInterest({ id: record.id, name, active });
      setResult(next);
      if (next.status === "success") router.refresh();
    });
  }

  return (
    <article className="space-y-3 rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <code className="text-xs text-slate-500">{record.slug}</code>
        <StatusBadge active={record.active} />
      </div>
      <label className="text-sm font-medium text-slate-800">
        Display name
        <input className={inputClass} disabled={pending} maxLength={120} onChange={(event) => setName(event.target.value)} value={name} />
      </label>
      <ActiveToggle active={active} disabled={pending} onChange={setActive} />
      <p className="text-xs leading-5 text-slate-500">The slug above is permanent and will not change when this name is edited.</p>
      <ResultMessage result={result} />
      <button className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" disabled={pending} onClick={save} type="button">
        {pending ? "Saving…" : "Save interest"}
      </button>
    </article>
  );
}

function TagCreateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [result, setResult] = useState<TaxonomyActionResult | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      const next = await saveTag({ name, active: true });
      setResult(next);
      if (next.status === "success") {
        setName("");
        router.refresh();
      }
    });
  }

  return (
    <form className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" onSubmit={submit}>
      <label className="text-sm font-medium text-slate-800">
        New tag
        <input className={inputClass} maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="Example: Petition signer" required value={name} />
      </label>
      <button className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Adding…" : "Add tag"}
      </button>
      <div className="sm:col-span-2"><ResultMessage result={result} /></div>
    </form>
  );
}

function TagEditor({ record }: { record: TagAdminRecord }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(record.name);
  const [active, setActive] = useState(record.active);
  const [result, setResult] = useState<TaxonomyActionResult | null>(null);

  function save() {
    setResult(null);
    startTransition(async () => {
      const next = await saveTag({ id: record.id, name, active });
      setResult(next);
      if (next.status === "success") router.refresh();
    });
  }

  return (
    <article className="space-y-3 rounded-lg border border-slate-200 p-3">
      <div className="flex justify-end"><StatusBadge active={record.active} /></div>
      <label className="text-sm font-medium text-slate-800">
        Display name
        <input className={inputClass} disabled={pending} maxLength={120} onChange={(event) => setName(event.target.value)} value={name} />
      </label>
      <ActiveToggle active={active} disabled={pending} onChange={setActive} />
      <ResultMessage result={result} />
      <button className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" disabled={pending} onClick={save} type="button">
        {pending ? "Saving…" : "Save tag"}
      </button>
    </article>
  );
}

function SourceCreateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [result, setResult] = useState<TaxonomyActionResult | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      const next = await saveSource({ name, category, active: true });
      setResult(next);
      if (next.status === "success") {
        setName("");
        setCategory("");
        router.refresh();
      }
    });
  }

  return (
    <form className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_minmax(11rem,0.5fr)_auto] md:items-end" onSubmit={submit}>
      <label className="text-sm font-medium text-slate-800">
        New source
        <input className={inputClass} maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="Example: Albany town hall" required value={name} />
      </label>
      <label className="text-sm font-medium text-slate-800">
        Category
        <input className={inputClass} maxLength={40} onChange={(event) => setCategory(event.target.value)} placeholder="event" required value={category} />
      </label>
      <button className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Adding…" : "Add source"}
      </button>
      <div className="md:col-span-3"><ResultMessage result={result} /></div>
    </form>
  );
}

function SourceEditor({ record }: { record: SourceAdminRecord }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(record.name);
  const [category, setCategory] = useState(record.category);
  const [active, setActive] = useState(record.active);
  const [result, setResult] = useState<TaxonomyActionResult | null>(null);

  function save() {
    setResult(null);
    startTransition(async () => {
      const next = await saveSource({ id: record.id, name, category, active });
      setResult(next);
      if (next.status === "success") router.refresh();
    });
  }

  return (
    <article className="space-y-3 rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <code className="text-xs text-slate-500">{record.slug}</code>
        <StatusBadge active={record.active} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-800">
          Display name
          <input className={inputClass} disabled={pending} maxLength={120} onChange={(event) => setName(event.target.value)} value={name} />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Category
          <input className={inputClass} disabled={pending} maxLength={40} onChange={(event) => setCategory(event.target.value)} value={category} />
        </label>
      </div>
      <ActiveToggle active={active} disabled={pending} onChange={setActive} />
      <p className="text-xs leading-5 text-slate-500">The slug above is permanent. Category and display name may be updated without breaking historical source links.</p>
      <ResultMessage result={result} />
      <button className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" disabled={pending} onClick={save} type="button">
        {pending ? "Saving…" : "Save source"}
      </button>
    </article>
  );
}

function SectionHeader({ title, description, count }: { title: string; description: string; count: number }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <span className="text-sm text-slate-500">{count.toLocaleString()} total</span>
    </div>
  );
}

export function TaxonomyManagement({
  interests,
  tags,
  sources,
}: {
  interests: InterestAdminRecord[];
  tags: TagAdminRecord[];
  sources: SourceAdminRecord[];
}) {
  const hydrated = useHydrated();

  return (
    <fieldset className="space-y-6 border-0 p-0" disabled={!hydrated} aria-busy={!hydrated}>
      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <SectionHeader count={interests.length} description="Issue and activity interests used for supporter targeting and intake." title="Interests" />
        <InterestCreateForm />
        <div className="grid gap-3 xl:grid-cols-2">
          {interests.map((record) => <InterestEditor key={record.id} record={record} />)}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <SectionHeader count={tags.length} description="Flexible organizer labels for segmentation, follow-up, and campaign context." title="Tags" />
        <TagCreateForm />
        {tags.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No tags have been created yet.</p>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {tags.map((record) => <TagEditor key={record.id} record={record} />)}
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <SectionHeader count={sources.length} description="Where supporter records originated, such as web forms, events, petitions, or imports." title="Sources" />
        <SourceCreateForm />
        <div className="grid gap-3 xl:grid-cols-2">
          {sources.map((record) => <SourceEditor key={record.id} record={record} />)}
        </div>
      </section>
    </fieldset>
  );
}
