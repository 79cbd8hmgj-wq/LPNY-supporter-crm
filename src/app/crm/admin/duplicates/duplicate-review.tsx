"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  DuplicateActionResult,
  DuplicatePersonRecord,
  DuplicateReviewRecord,
} from "@/lib/admin/duplicates";
import { resolveDuplicateCandidate } from "./actions";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function stageLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 border-t border-slate-100 py-2 first:border-t-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function PersonPanel({
  candidateId,
  person,
  selected,
  onSelect,
}: {
  candidateId: string;
  person: DuplicatePersonRecord;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label className={`block cursor-pointer rounded-xl border p-4 transition ${selected ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <div className="flex items-start gap-3">
        <input
          checked={selected}
          className="mt-1"
          name={`canonical-${candidateId}`}
          onChange={onSelect}
          type="radio"
          value={person.id}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950">{person.firstName} {person.lastName}</h3>
            {selected ? <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-medium text-white">Canonical</span> : null}
            {person.doNotContact ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Do not contact</span> : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">Created {formatDate(person.createdAt)}</p>
        </div>
      </div>

      <dl className="mt-4">
        <DetailRow label="Email" value={person.email} />
        <DetailRow label="Phone" value={person.phone} />
        <DetailRow label="ZIP" value={person.zipCode} />
        <DetailRow label="County" value={person.countyName} />
        <DetailRow label="Municipality" value={person.municipality} />
        <DetailRow label="Stage" value={stageLabel(person.engagementStage)} />
        <DetailRow label="Last activity" value={formatDate(person.lastActivityAt)} />
      </dl>
    </label>
  );
}

function ResultMessage({ result }: { result: DuplicateActionResult | null }) {
  if (!result) return null;
  const classes = result.status === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-red-200 bg-red-50 text-red-800";
  return <p className={`rounded-lg border p-3 text-sm ${classes}`} role="status">{result.message}</p>;
}

function CandidateReview({ candidate }: { candidate: DuplicateReviewRecord }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [primaryPersonId, setPrimaryPersonId] = useState<string | null>(null);
  const [result, setResult] = useState<DuplicateActionResult | null>(null);
  const [resolved, setResolved] = useState(false);

  const confidence = candidate.confidence === null ? null : Math.round(candidate.confidence * 100);

  function submitKeepSeparate() {
    setResult(null);
    startTransition(async () => {
      const next = await resolveDuplicateCandidate({
        candidateId: candidate.id,
        resolution: "keep_separate",
        personAId: candidate.personAId,
        personBId: candidate.personBId,
        primaryPersonId: null,
      });
      setResult(next);
      if (next.status === "success") {
        setResolved(true);
        router.refresh();
      }
    });
  }

  function submitMerge() {
    if (!primaryPersonId) {
      setResult({ status: "error", message: "Choose which supporter should remain as the canonical record." });
      return;
    }

    const canonical = primaryPersonId === candidate.personA.id ? candidate.personA : candidate.personB;
    const secondary = primaryPersonId === candidate.personA.id ? candidate.personB : candidate.personA;
    const confirmed = window.confirm(
      `Merge ${secondary.firstName} ${secondary.lastName} into ${canonical.firstName} ${canonical.lastName}? The non-canonical record will be archived and its history moved to the canonical supporter. This cannot be undone from this screen.`,
    );
    if (!confirmed) return;

    setResult(null);
    startTransition(async () => {
      const next = await resolveDuplicateCandidate({
        candidateId: candidate.id,
        resolution: "merge",
        personAId: candidate.personAId,
        personBId: candidate.personBId,
        primaryPersonId,
      });
      setResult(next);
      if (next.status === "success") {
        setResolved(true);
        router.refresh();
      }
    });
  }

  return (
    <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Possible duplicate</p>
          <h2 className="mt-1 font-semibold text-slate-950">{candidate.reason}</h2>
          <p className="mt-1 text-xs text-slate-500">Detected {formatDate(candidate.createdAt)}</p>
        </div>
        {confidence !== null ? (
          <span className="w-fit rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{confidence}% confidence</span>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-800">Choose the canonical supporter only if you plan to merge.</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <PersonPanel
            candidateId={candidate.id}
            onSelect={() => setPrimaryPersonId(candidate.personA.id)}
            person={candidate.personA}
            selected={primaryPersonId === candidate.personA.id}
          />
          <PersonPanel
            candidateId={candidate.id}
            onSelect={() => setPrimaryPersonId(candidate.personB.id)}
            person={candidate.personB}
            selected={primaryPersonId === candidate.personB.id}
          />
        </div>
      </div>

      <ResultMessage result={result} />

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending || resolved}
          onClick={submitKeepSeparate}
          type="button"
        >
          {pending ? "Saving…" : "Keep separate"}
        </button>
        <button
          className="min-h-11 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending || resolved || !primaryPersonId}
          onClick={submitMerge}
          type="button"
        >
          {pending ? "Merging…" : "Merge selected records"}
        </button>
      </div>
    </article>
  );
}

export function DuplicateReview({ candidates }: { candidates: DuplicateReviewRecord[] }) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        No open duplicate candidates need review.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Open candidates</h2>
          <p className="mt-1 text-sm text-slate-600">Review the highest-confidence matches first. Database authorization and audit logging are enforced again when you submit a resolution.</p>
        </div>
        <span className="shrink-0 text-sm font-medium text-slate-600">{candidates.length} open</span>
      </div>
      {candidates.map((candidate) => <CandidateReview candidate={candidate} key={candidate.id} />)}
    </div>
  );
}
