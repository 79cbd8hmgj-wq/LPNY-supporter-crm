import Link from "next/link";
import type { ReactNode } from "react";
import { requireSupporter } from "@/lib/auth/require-supporter";
import { supporterSignOutAction } from "./actions";

export default async function SupporterLayout({ children }: { children: ReactNode }) {
  await requireSupporter();

  return (
    <div className="min-h-screen bg-lp-50 text-lp-950">
      <header className="border-b-4 border-lp-gold bg-lp-navy text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link className="font-semibold tracking-tight text-white" href="/supporter">
            <span className="text-lp-gold">LPNY</span> Supporter Portal
          </Link>
          <form action={supporterSignOutAction}>
            <button className="text-sm font-medium text-white underline" type="submit">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
