import Link from "next/link";
import { requireSupporter } from "@/lib/auth/require-supporter";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supporterSignOutAction } from "./actions";
import { SupporterEmailForm } from "./supporter-email-form";
import { SupporterProfileForm } from "./supporter-profile-form";

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function SupporterPortalPage() {
  await requireSupporter();
  const supabase = await createServerSupabaseClient();

  const [
    { data: profiles, error: profileError },
    { data: interests, error: interestsError },
    { data: events, error: eventsError },
  ] = await Promise.all([
    supabase.rpc("get_my_supporter_profile"),
    supabase.rpc("list_supporter_interests"),
    supabase.rpc("list_my_upcoming_events", { p_limit: 20 }),
  ]);

  if (profileError || interestsError || !profiles?.[0]) {
    throw new Error("Unable to load supporter profile");
  }

  const profile = profiles[0];

  return (
    <div className="min-h-screen bg-lp-50 text-lp-950">
      <header className="border-b-4 border-lp-gold bg-lp-navy text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link className="font-semibold tracking-tight text-white" href="/supporter">
            <span className="text-lp-gold">LPNY</span> Supporter Portal
          </Link>
          <form action={supporterSignOutAction}>
            <button className="text-sm font-medium text-white underline" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <section>
          <p className="text-sm font-semibold uppercase tracking-wide text-lp-500">
            Supporter portal
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Welcome, {profile.first_name}
          </h1>
          <p className="mt-2 text-lp-600">
            Your LPNY information and upcoming opportunities in one place.
          </p>
        </section>

        <section className="rounded-xl border border-lp-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">My profile</h2>
          <p className="mt-1 text-sm text-lp-600">
            Keep your contact information, interests, and communication preferences current.
          </p>
          <SupporterEmailForm email={profile.email} />
          <SupporterProfileForm profile={profile} interests={interests ?? []} />
        </section>

        <section className="rounded-xl border border-lp-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Upcoming events</h2>
          {eventsError ? (
            <p className="mt-3 text-sm text-red-700">Upcoming events could not be loaded.</p>
          ) : events?.length ? (
            <div className="mt-4 divide-y divide-lp-100">
              {events.map((event) => (
                <article className="py-4 first:pt-0 last:pb-0" key={event.id}>
                  <h3 className="font-semibold">{event.title}</h3>
                  <p className="mt-1 text-sm text-lp-600">{formatEventTime(event.starts_at)}</p>
                  {event.location ? <p className="mt-1 text-sm text-lp-600">{event.location}</p> : null}
                  {event.description ? (
                    <p className="mt-2 leading-6 text-lp-700">{event.description}</p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-lp-600">No supporter events are published yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}
