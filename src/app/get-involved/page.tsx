import Link from "next/link";
import { GetInvolvedForm } from "./get-involved-form";

export default function GetInvolvedPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link className="text-sm font-medium text-lp-600 hover:text-lp-900" href="/">
        ← LPNY
      </Link>
      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-lp-500">Get involved</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Help build a freer New York</h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-lp-600">
          Tell us how to reach you and what you are interested in. The first step takes about a minute.
        </p>
      </div>
      <GetInvolvedForm />
    </main>
  );
}
