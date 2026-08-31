import Link from "next/link";
import { requireStaffRole } from "@/lib/auth/require-role";
import { CsvImportWizard } from "./csv-import-wizard";

export default async function CsvImportPage() {
  await requireStaffRole(["admin"]);

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm font-medium text-slate-600 hover:text-slate-950" href="/crm/admin">
          ← Administration
        </Link>
        <p className="mt-5 text-sm font-medium uppercase tracking-wide text-slate-500">Administration</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">Guided CSV import</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
          Upload a supporter CSV, map its columns, review validation and possible matches, then apply explicit row decisions. Exact email matches are updated rather than duplicated.
        </p>
      </div>

      <CsvImportWizard />
    </section>
  );
}
