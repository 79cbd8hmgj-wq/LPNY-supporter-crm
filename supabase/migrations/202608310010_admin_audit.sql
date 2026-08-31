create table public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_staff_user_id uuid not null references public.staff_users(id) on delete restrict,
  action_type text not null check (length(trim(action_type)) > 0),
  target_type text not null check (length(trim(target_type)) > 0),
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index admin_audit_events_occurred_at_idx
  on public.admin_audit_events (occurred_at desc);

create or replace function private.append_admin_audit(
  action_type text,
  target_type text,
  target_id uuid,
  metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  audit_id uuid;
  actor_id uuid;
begin
  actor_id := private.current_staff_user_id();

  if actor_id is null then
    raise exception 'active staff required' using errcode = '42501';
  end if;

  insert into public.admin_audit_events (
    actor_staff_user_id,
    action_type,
    target_type,
    target_id,
    metadata
  ) values (
    actor_id,
    trim(action_type),
    trim(target_type),
    target_id,
    coalesce(metadata, '{}'::jsonb)
  )
  returning id into audit_id;

  return audit_id;
end;
$$;

revoke all on function private.append_admin_audit(text, text, uuid, jsonb) from public, authenticated;
