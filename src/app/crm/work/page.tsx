import { requireStaffUser } from "@/lib/auth/require-staff";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EventForm, TaskForm } from "./work-forms";

export default async function WorkPage() {
  await requireStaffUser();
  const supabase = await createServerSupabaseClient();
  const [{ data: people }, { data: events }] = await Promise.all([
    supabase.from("people").select("id, first_name, last_name").is("archived_at", null).order("last_name").limit(500),
    supabase.from("crm_events").select("id, title, location, starts_at, ends_at").gte("starts_at", new Date().toISOString()).order("starts_at").limit(20),
  ]);
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" });
  return <section className="space-y-6"><header><p className="text-sm font-medium uppercase tracking-wide text-lp-500">Organizer workspace</p><h1 className="mt-1 text-3xl font-semibold">Events &amp; Tasks</h1><p className="mt-2 text-lp-600">Plan shared events and create supporter-specific work.</p></header>
    <div className="grid gap-6 lg:grid-cols-2"><EventForm /><TaskForm people={(people ?? []).map(p => ({ id: p.id, name: `${p.first_name} ${p.last_name}` }))} /></div>
    <section className="rounded-xl border border-lp-200 bg-white p-5"><h2 className="text-lg font-semibold">Upcoming events</h2>{events?.length ? <ul className="mt-3 divide-y divide-lp-100">{events.map(event => <li className="py-3" key={event.id}><div className="font-medium">{event.title}</div><div className="text-sm text-lp-600">{formatter.format(new Date(event.starts_at))}{event.location ? ` · ${event.location}` : ""}</div></li>)}</ul> : <p className="mt-3 text-sm text-lp-500">No upcoming events. Create the first one above.</p>}</section>
  </section>;
}
