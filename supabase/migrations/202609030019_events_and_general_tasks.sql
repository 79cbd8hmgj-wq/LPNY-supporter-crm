-- Shared organizer events and a safe entry point for creating named supporter tasks.
create table public.crm_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 160),
  description text check (description is null or length(trim(description)) between 1 and 2000),
  location text check (location is null or length(trim(location)) between 1 and 240),
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by_staff_user_id uuid not null references public.staff_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create index crm_events_starts_at_idx on public.crm_events(starts_at);
alter table public.crm_events enable row level security;
revoke all on table public.crm_events from anon;
grant select on table public.crm_events to authenticated, service_role;
grant insert, update, delete on table public.crm_events to service_role;

create policy crm_events_staff_read on public.crm_events for select to authenticated
using (private.is_active_staff());

create or replace function public.create_crm_event(
  p_title text, p_description text, p_location text,
  p_starts_at timestamptz, p_ends_at timestamptz default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_id uuid;
begin
  v_actor := private.current_staff_user_id();
  if v_actor is null then raise exception 'active staff required' using errcode = '42501'; end if;
  if nullif(trim(p_title), '') is null or length(trim(p_title)) > 160 or p_starts_at is null
    or (p_ends_at is not null and p_ends_at <= p_starts_at) then
    raise exception 'invalid event details' using errcode = '22023';
  end if;
  insert into public.crm_events(title, description, location, starts_at, ends_at, created_by_staff_user_id)
  values (trim(p_title), nullif(trim(p_description), ''), nullif(trim(p_location), ''), p_starts_at, p_ends_at, v_actor)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.create_person_task(
  p_person_id uuid, p_task_type text, p_due_at timestamptz, p_priority public.task_priority
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid; v_assignee uuid; v_id uuid;
begin
  v_actor := private.require_active_person_access(p_person_id);
  if nullif(trim(p_task_type), '') is null or length(trim(p_task_type)) > 120 or p_due_at is null then
    raise exception 'invalid task details' using errcode = '22023';
  end if;
  select coalesce(assigned_staff_user_id, v_actor) into v_assignee from public.people where id = p_person_id;
  insert into public.tasks(person_id, assignee_staff_user_id, task_type, due_at, priority, status, created_by_staff_user_id)
  values (p_person_id, v_assignee, trim(p_task_type), p_due_at, coalesce(p_priority, 'normal'), 'open', v_actor)
  returning id into v_id;
  insert into public.activities(person_id, activity_type, actor_staff_user_id, metadata)
  values (p_person_id, 'task_created', v_actor, jsonb_build_object('task_id', v_id, 'task_type', trim(p_task_type), 'due_at', p_due_at));
  return v_id;
end $$;

revoke all on function public.create_crm_event(text, text, text, timestamptz, timestamptz) from public, anon;
revoke all on function public.create_person_task(uuid, text, timestamptz, public.task_priority) from public, anon;
grant execute on function public.create_crm_event(text, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.create_person_task(uuid, text, timestamptz, public.task_priority) to authenticated;
