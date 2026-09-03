import Link from "next/link";
import { requireStaffRole } from "@/lib/auth/require-role";
import { loadDuplicateReviewData } from "@/lib/admin/duplicate-data";
import { DuplicateReview } from "./duplicate-review";

export default async function DuplicateReviewPage() {
  await requireStaffRole(["admin", "state_organizer"]);
  const candidates = await loadDuplicateReviewData();

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm font-medium text-lp-600 hover:text-lp-950 hover:underline" href="/crm/admin">
          ← Administration
        </Link>
        <p className="mt-4 text-sm font-medium uppercase tracking-wide text-lp-500">Admin + State Organizer</p>
        <h1 className="mt-1 text-2xl font-semibold text-lp-950 sm:text-3xl">Duplicate review</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-lp-600 sm:text-base">
          Compare possible duplicate supporters side by side. Keeping records separate only closes the review candidate. Merging archives the non-canonical record and preserves its organizing history on the canonical supporter.
        </p>
      </div>

      <DuplicateReview candidates={candidates} />
    </section>
  );
}
