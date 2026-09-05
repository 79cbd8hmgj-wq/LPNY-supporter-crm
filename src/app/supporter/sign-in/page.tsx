import Link from "next/link";
import { SupporterSignInForm } from "./supporter-sign-in-form";

const errors: Record<string, string> = {
  "not-linked": "This signed-in account is not linked to a supporter profile.",
};

export default async function SupporterSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error ? errors[params.error] : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <Link className="text-sm font-medium text-lp-600 hover:text-lp-900" href="/">
        ← LPNY
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Supporter sign in</h1>
      <p className="mt-2 text-sm leading-6 text-lp-600">
        Continue with Google for the fastest sign-in. If your Google email is not the one you used with LPNY, you can still request an email sign-in link.
      </p>
      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      <SupporterSignInForm />
      <p className="mt-6 text-sm text-lp-600">
        New here? <Link className="font-medium underline" href="/get-involved">Get involved first</Link>.
      </p>
    </main>
  );
}
