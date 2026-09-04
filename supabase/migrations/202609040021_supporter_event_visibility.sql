-- Event publication controls for the supporter portal.
-- Existing organizer-created events remain staff-only by default.

create type public.crm_event_visibility as enum ('staff', 'supporters', 'public');

alter table public.crm_events
  add column visibility public.crm_event_visibility not null default 'staff';

create index crm_events_portal_upcoming_idx
  on public.crm_events (visibility, starts_at);

create or replace function public.set_crm_event_visibility(
  p_event_id uuid,
  p_visibility public.crm_event_visibility
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_updated integer;
begin
  v_actor := private.current_staff_user_id();
  if v_actor is null then
    raise exception 'active staff required' using errcode = '42501';
  end if;

  update public.crm_events
     set visibility = p_visibility
   where id = p_event_id;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'event not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_crm_event_visibility(uuid, public.crm_event_visibility) from public, anon;
grant execute on function public.set_crm_event_visibility(uuid, public.crm_event_visibility) to authenticated;

create or replace function public.list_my_upcoming_events(
  p_limit integer default 50
)
returns table (
  id uuid,
  title text,
  description text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id,
    e.title,
    e.description,
    e.location,
    e.starts_at,
    e.ends_at
  from public.crm_events e
  where private.is_supporter()
    and e.visibility in ('supporters'::public.crm_event_visibility, 'public'::public.crm_event_visibility)
    and e.starts_at >= now()
  order by e.starts_at asc, e.id asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
$$;

revoke all on function public.list_my_upcoming_events(integer) from public, anon;
grant execute on function public.list_my_upcoming_events(integer) to authenticated;
