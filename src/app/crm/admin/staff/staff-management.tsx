"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  StaffActionResult,
  StaffCountyOption,
  StaffManagementRecord,
  StaffRole,
  StaffStatus,
} from "@/lib/admin/staff";
import { inviteStaffMember, setStaffTemporaryPassword, updateStaffAccess } from "./actions";

const roleLabels: Record<StaffRole, string> = {
  admin: "Admin",
  state_organizer: "State Organizer",
  county_organizer: "County Organizer",
  volunteer_staff: "Volunteer Staff",
};

const inputClass = "mt-1 min-h-11 w-full rounded-lg border border-lp-300 bg-white px-3 py-2 text-sm text-lp-950 outline-none transition focus:border-lp-700 focus:ring-2 focus:ring-lp-200";

function ResultMessage({ result }: { result: StaffActionResult | null }) {
  if (!result) return null;
  const className = result.status === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-red-200 bg-red-50 text-red-800";
  return <p className={`rounded-lg border p-3 text-sm ${className}`} role="status">{result.message}</p>;
}

function CountyPicker({
  counties,
  selected,
  onToggle,
  disabled,
}: {
  counties: StaffCountyOption[];
  selected: Set<string>;
  onToggle: (countyId: string) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="rounded-lg border border-lp-200 bg-lp-50 p-3">
      <legend className="px-1 text-sm font-medium text-lp-800">County assignments</legend>
      <p className="mb-2 text-xs text-lp-500">Select every county this organizer may work in.</p>
      <div className="grid max-h-52 gap-1 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {counties.map((county) => (
          <label className="flex min-h-9 items-center gap-2 rounded px-2 py-1 text-sm hover:bg-white" key={county.id}>
            <input
              checked={selected.has(county.id)}
              disabled={disabled}
              onChange={() => onToggle(county.id)}
              type="checkbox"
            />
            <span>{county.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function InviteStaffForm({ counties }: { counties: StaffCountyOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<StaffActionResult | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<StaffRole>("volunteer_staff");
  const [countyIds, setCountyIds] = useState<Set<string>>(new Set());

  function changeRole(nextRole: StaffRole) {
    setRole(nextRole);
    if (nextRole !== "county_organizer") setCountyIds(new Set());
  }

  function toggleCounty(countyId: string) {
    setCountyIds((current) => {
      const next = new Set(current);
      if (next.has(countyId)) next.delete(countyId);
      else next.add(countyId);
      return next;
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      const next = await inviteStaffMember({
        email,
        displayName,
        role,
        countyIds: [...countyIds],
      });
      setResult(next);
      if (next.status === "success") {
        setEmail("");
        setDisplayName("");
        setRole("volunteer_staff");
        setCountyIds(new Set());
        router.refresh();
      }
    });
  }

  return (
    <form className="space-y-4 rounded-xl border border-lp-200 bg-white p-4 shadow-sm sm:p-5" onSubmit={submit}>
      <div>
        <h2 className="font-semibold text-lp-950">Invite staff member</h2>
        <p className="mt-1 text-sm text-lp-600">The invitation email is sent through Supabase Auth. CRM access is activated only after the staff record is registered successfully.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-lp-800">
          Display name
          <input className={inputClass} onChange={(event) => setDisplayName(event.target.value)} required value={displayName} />
        </label>
        <label className="text-sm font-medium text-lp-800">
          Email
          <input autoComplete="email" className={inputClass} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>
        <label className="text-sm font-medium text-lp-800 md:max-w-sm">
          Role
          <select className={inputClass} onChange={(event) => changeRole(event.target.value as StaffRole)} value={role}>
            {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      {role === "county_organizer" ? (
        <CountyPicker counties={counties} onToggle={toggleCounty} selected={countyIds} />
      ) : null}
      <ResultMessage result={result} />
      <button className="min-h-11 rounded-lg bg-lp-900 px-4 py-2 text-sm font-semibold text-white hover:bg-lp-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Sending invitation…" : "Send invitation"}
      </button>
    </form>
  );
}

function StaffAccessEditor({ record, counties }: { record: StaffManagementRecord; counties: StaffCountyOption[] }) {
  const [pending, startTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();
  const [result, setResult] = useState<StaffActionResult | null>(null);
  const [passwordResult, setPasswordResult] = useState<StaffActionResult | null>(null);
  const [role, setRole] = useState<StaffRole>(record.role);
  const [status, setStatus] = useState<StaffStatus>(record.status);
  const [savedStatus, setSavedStatus] = useState<StaffStatus>(record.status);
  const [countyIds, setCountyIds] = useState<Set<string>>(new Set(record.countyIds));
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [confirmTemporaryPassword, setConfirmTemporaryPassword] = useState("");

  function changeRole(nextRole: StaffRole) {
    setRole(nextRole);
    if (nextRole !== "county_organizer") setCountyIds(new Set());
  }

  function toggleCounty(countyId: string) {
    setCountyIds((current) => {
      const next = new Set(current);
      if (next.has(countyId)) next.delete(countyId);
      else next.add(countyId);
      return next;
    });
  }

  function save() {
    if (savedStatus === "active" && status === "disabled") {
      const confirmed = window.confirm(`Disable CRM access for ${record.displayName}? They will no longer be able to enter the organizer workspace.`);
      if (!confirmed) return;
    }

    setResult(null);
    startTransition(async () => {
      const next = await updateStaffAccess({
        staffUserId: record.id,
        role,
        status,
        countyIds: [...countyIds],
      });
      setResult(next);
      if (next.status === "success") setSavedStatus(status);
    });
  }

  function submitTemporaryPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordResult(null);

    const confirmed = window.confirm(
      `Set a new temporary password for ${record.displayName}? Their current password will stop working immediately.`,
    );
    if (!confirmed) return;

    const password = temporaryPassword;
    const confirmPassword = confirmTemporaryPassword;
    startPasswordTransition(async () => {
      try {
        const next = await setStaffTemporaryPassword({
          staffUserId: record.id,
          password,
          confirmPassword,
        });
        setPasswordResult(next);
      } catch {
        setPasswordResult({ status: "error", message: "Unable to change this staff password right now." });
      } finally {
        setTemporaryPassword("");
        setConfirmTemporaryPassword("");
      }
    });
  }

  return (
    <article className="space-y-4 rounded-xl border border-lp-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-lp-950">{record.displayName}</h3>
          <p className="text-xs text-lp-500">{record.invitedAt ? `Invited ${new Date(record.invitedAt).toLocaleDateString()}` : "Staff record"}</p>
        </div>
        <span className={`w-fit rounded-full px-2 py-1 text-xs font-medium ${savedStatus === "active" ? "bg-emerald-50 text-emerald-700" : "bg-lp-100 text-lp-600"}`}>
          {savedStatus === "active" ? "Active" : "Disabled"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-lp-800">
          Role
          <select className={inputClass} onChange={(event) => changeRole(event.target.value as StaffRole)} value={role}>
            {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-lp-800">
          Account status
          <select className={inputClass} onChange={(event) => setStatus(event.target.value as StaffStatus)} value={status}>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
      </div>

      {role === "county_organizer" ? (
        <CountyPicker counties={counties} disabled={pending} onToggle={toggleCounty} selected={countyIds} />
      ) : null}
      <ResultMessage result={result} />
      <button className="min-h-10 rounded-lg border border-lp-300 px-3 py-2 text-sm font-semibold text-lp-800 hover:bg-lp-50 disabled:cursor-not-allowed disabled:opacity-60" disabled={pending} onClick={save} type="button">
        {pending ? "Saving…" : "Save access"}
      </button>

      <details className="rounded-lg border border-lp-200 bg-lp-50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-lp-900">Set temporary password</summary>
        <form className="mt-3 space-y-3" onSubmit={submitTemporaryPassword}>
          <p className="text-xs leading-5 text-lp-600">
            Emergency recovery when Auth email delivery is unavailable. This replaces the current password immediately and sends no email. The password remains valid until the staff member changes it.
          </p>
          <label className="block text-sm font-medium text-lp-800">
            Temporary password
            <input
              autoComplete="new-password"
              className={inputClass}
              disabled={passwordPending || savedStatus !== "active"}
              minLength={12}
              onChange={(event) => setTemporaryPassword(event.target.value)}
              required
              type="password"
              value={temporaryPassword}
            />
          </label>
          <label className="block text-sm font-medium text-lp-800">
            Confirm temporary password
            <input
              autoComplete="new-password"
              className={inputClass}
              disabled={passwordPending || savedStatus !== "active"}
              minLength={12}
              onChange={(event) => setConfirmTemporaryPassword(event.target.value)}
              required
              type="password"
              value={confirmTemporaryPassword}
            />
          </label>
          <p className="text-xs text-lp-500">Use at least 12 characters with uppercase, lowercase, a number, and a symbol.</p>
          <ResultMessage result={passwordResult} />
          <button
            className="min-h-10 rounded-lg border border-lp-400 bg-white px-3 py-2 text-sm font-semibold text-lp-900 hover:bg-lp-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={passwordPending || savedStatus !== "active"}
            type="submit"
          >
            {savedStatus !== "active" ? "Reactivate account first" : passwordPending ? "Setting password…" : "Set temporary password"}
          </button>
        </form>
      </details>
    </article>
  );
}

export function StaffManagement({
  staff,
  counties,
}: {
  staff: StaffManagementRecord[];
  counties: StaffCountyOption[];
}) {
  return (
    <div className="space-y-6">
      <InviteStaffForm counties={counties} />
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-lp-950">Current staff</h2>
          <p className="mt-1 text-sm text-lp-600">Role, status, county, and emergency password changes are restricted to Admins and recorded in the administrative audit trail.</p>
        </div>
        {staff.length === 0 ? (
          <div className="rounded-xl border border-lp-200 bg-white p-6 text-sm text-lp-600">No staff records are visible.</div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {staff.map((record) => <StaffAccessEditor counties={counties} key={record.id} record={record} />)}
          </div>
        )}
      </section>
    </div>
  );
}
