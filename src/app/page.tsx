import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center p-6">
      <p className="text-sm font-medium uppercase tracking-wide text-slate-500">LPNY</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Supporter CRM</h1>
      <p className="mt-4 max-w-xl text-slate-600">
        Organizing infrastructure for supporter follow-up and engagement across New York.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="inline-flex min-h-11 items-center rounded-md bg-slate-900 px-4 py-2 font-medium text-white" href="/get-involved">
          Get involved
        </Link>
        <Link className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-800" href="/login">
          Staff sign in
        </Link>
      </div>
    </main>
  );
}
