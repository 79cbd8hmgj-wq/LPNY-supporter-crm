"use client";

import { useActionState } from "react";
import { createEventAction, createTaskAction } from "./actions";

const initial = { status: "success" as const, message: "" };
const input = "min-h-11 w-full rounded-lg border border-lp-300 bg-white px-3 py-2 text-sm text-lp-950";
const button = "min-h-11 rounded-lg bg-lp-navy px-4 py-2 text-sm font-semibold text-white hover:bg-lp-800 disabled:opacity-60";

function Status({ result }: { result: typeof initial | { status: "success" | "error"; message: string } }) {
  return result.message ? <p role="status" className={`rounded-lg p-3 text-sm ${result.status === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{result.message}</p> : null;
}

export function TaskForm({ people }: { people: Array<{ id: string; name: string }> }) {
  const [result, action, pending] = useActionState(createTaskAction, initial);
  return <form action={action} className="space-y-3 rounded-xl border border-lp-200 bg-white p-5 shadow-sm">
    <h2 className="text-lg font-semibold">Create task</h2><p className="text-sm text-lp-600">Assign a specific next step to any supporter you can access.</p><Status result={result} />
    <label className="block text-sm font-medium">Supporter<select className={`${input} mt-1`} name="personId" required defaultValue=""><option value="" disabled>Select a supporter</option>{people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
    <label className="block text-sm font-medium">Task title<input className={`${input} mt-1`} name="title" maxLength={120} placeholder="Call about volunteering" required /></label>
    <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Due date and time<input className={`${input} mt-1`} type="datetime-local" name="dueAt" required /></label><label className="block text-sm font-medium">Priority<select className={`${input} mt-1`} name="priority" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label></div>
    <button className={button} disabled={pending}>{pending ? "Creating…" : "Create task"}</button>
  </form>;
}

export function EventForm() {
  const [result, action, pending] = useActionState(createEventAction, initial);
  return <form action={action} className="space-y-3 rounded-xl border border-lp-200 bg-white p-5 shadow-sm">
    <h2 className="text-lg font-semibold">Create event</h2><p className="text-sm text-lp-600">Add an event to the shared organizer calendar.</p><Status result={result} />
    <label className="block text-sm font-medium">Event title<input className={`${input} mt-1`} name="title" maxLength={160} placeholder="Albany volunteer meetup" required /></label>
    <label className="block text-sm font-medium">Location<input className={`${input} mt-1`} name="location" maxLength={240} /></label>
    <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Starts<input className={`${input} mt-1`} type="datetime-local" name="startsAt" required /></label><label className="block text-sm font-medium">Ends (optional)<input className={`${input} mt-1`} type="datetime-local" name="endsAt" /></label></div>
    <label className="block text-sm font-medium">Description<textarea className={`${input} mt-1 min-h-24`} name="description" maxLength={2000} /></label>
    <button className={button} disabled={pending}>{pending ? "Creating…" : "Create event"}</button>
  </form>;
}
