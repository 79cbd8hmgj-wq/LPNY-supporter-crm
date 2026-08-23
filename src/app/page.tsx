import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center p-6">
      <p className="text-sm font-medium uppercase tracking-wide text-slate-500">LPNY</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Supporter CRM</h1>
      <p className="mt-4 max-w-xl text-slate-600">
        Internal organizing infrastructure for supporter follow-up and engagement.
      </p>
      <div className="mt-8">
        <Link className="inline-flex rounded-md bg-slate-900 px-4 py-2 font-medium text-white" href="/login">
          Staff sign in
        </Link>
      </div>
    </main>
  );
}
