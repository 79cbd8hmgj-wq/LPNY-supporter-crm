import { requireStaffUser } from "@/lib/auth/require-staff";
import { QuickAddForm } from "./quick-add-form";

export default async function QuickAddPage() {
  const staff = await requireStaffUser();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Organizer workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Quick Add</h1>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Add someone from an event or conversation with only their name, email or phone, and ZIP code. You can enrich the profile later.
        </p>
      </header>

      {staff.role === "volunteer_staff" ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Quick Add is not available for this role.</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Volunteer/Staff accounts can work only with contacts explicitly assigned to them.
          </p>
        </section>
      ) : (
        <QuickAddForm />
      )}
    </div>
  );
}
