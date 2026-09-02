import Link from "next/link";
import { requireStaffRole } from "@/lib/auth/require-role";
import { loadTaxonomyAdministrationData } from "@/lib/admin/taxonomy-data";
import { TaxonomyManagement } from "./taxonomy-management";

export default async function TaxonomyAdministrationPage() {
  await requireStaffRole(["admin", "state_organizer"]);
  const data = await loadTaxonomyAdministrationData();

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm font-medium text-slate-600 hover:text-slate-950 hover:underline" href="/crm/admin">
          ← Administration
        </Link>
        <p className="mt-4 text-sm font-medium uppercase tracking-wide text-slate-500">Admin + State Organizer</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">Sources, tags, and interests</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
          Maintain the shared vocabulary used across supporter records. Existing slugs remain stable when names change, and inactive values stay attached to historical records instead of being deleted.
        </p>
      </div>

      <TaxonomyManagement interests={data.interests} sources={data.sources} tags={data.tags} />
    </section>
  );
}
