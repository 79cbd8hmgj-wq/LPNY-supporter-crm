import Link from "next/link";
import { requireSupporter } from "@/lib/auth/require-supporter";
import { supporterSignOutAction } from "./actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
  const [{ data: profiles, error: profileError }, { data: events, error: eventsError }] = await Promise.all([
    supabase.rpc("get_my_supporter_profile"),
    supabase.rpc("list_my_upcoming_events", { p_limit: 20 }),
  ]);

  if (profileError || !profiles?.[0]) {
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
            <button className="text-sm font-medium text-white underline" type="submit">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-lp-500">Supporter portal</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Welcome, {profile.first_name}
        </h1>
        <p className="mt-2 text-lp-600">Your LPNY information and upcoming opportunities in one place.</p>
      </section>

      <section className="rounded-xl border border-lp-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">My profile</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-sm text-lp-500">Name</dt><dd className="font-medium">{profile.first_name} {profile.last_name}</dd></div>
          <div><dt className="text-sm text-lp-500">Email</dt><dd className="font-medium">{profile.email ?? "Not provided"}</dd></div>
          <div><dt className="text-sm text-lp-500">Phone</dt><dd className="font-medium">{profile.phone ?? "Not provided"}</dd></div>
          <div><dt className="text-sm text-lp-500">Location</dt><dd className="font-medium">{[profile.municipality, profile.county_name, profile.zip_code].filter(Boolean).join(" · ") || "Not provided"}</dd></div>
        </dl>

        <div className="mt-5">
          <h3 className="text-sm font-medium text-lp-700">Interests</h3>
          <p className="mt-1">{profile.interests.length ? profile.interests.join(" · ") : "No interests selected yet"}</p>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-medium text-lp-700">Communication preferences</h3>
          <p className="mt-1 text-sm text-lp-600">
            Email {profile.email_opt_in ? "on" : "off"} · Text {profile.sms_opt_in ? "on" : "off"} · Phone {profile.phone_opt_in ? "on" : "off"}
          </p>
        </div>
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
                {event.description ? <p className="mt-2 leading-6 text-lp-700">{event.description}</p> : null}
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
