-- Supporter event RSVP.
-- Supporters may RSVP only themselves to future supporter/public events.
-- Active staff may read RSVP rows for organizing purposes; supporters use scoped RPCs.

create type public.crm_event_rsvp_status as enum ('going', 'cancelled');

create table public.crm_event_rsvps (
  event_id uuid not null references public.crm_events(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  status public.crm_event_rsvp_status not null default 'going',
  responded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, person_id)
);

create index crm_event_rsvps_person_idx
  on public.crm_event_rsvps (person_id, status, event_id);

alter table public.crm_event_rsvps enable row level security;

revoke all on table public.crm_event_rsvps from public, anon, authenticated;
grant select on table public.crm_event_rsvps to authenticated;
grant select, insert, update, delete on table public.crm_event_rsvps to service_role;

create policy crm_event_rsvps_staff_read
on public.crm_event_rsvps
for select
to authenticated
using (private.is_active_staff());

create or replace function public.set_my_event_rsvp(
  p_event_id uuid,
  p_attending boolean
)
returns public.crm_event_rsvp_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person_id uuid;
  v_status public.crm_event_rsvp_status :=
    case when coalesce(p_attending, false)
      then 'going'::public.crm_event_rsvp_status
      else 'cancelled'::public.crm_event_rsvp_status
    end;
  v_previous public.crm_event_rsvp_status;
begin
  v_person_id := private.current_supporter_person_id();
  if v_person_id is null then
    raise exception 'supporter account required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.crm_events e
    where e.id = p_event_id
      and e.visibility in (
        'supporters'::public.crm_event_visibility,
        'public'::public.crm_event_visibility
      )
      and e.starts_at >= now()
  ) then
    raise exception 'event unavailable for RSVP' using errcode = 'P0002';
  end if;

  select r.status
    into v_previous
  from public.crm_event_rsvps r
  where r.event_id = p_event_id
    and r.person_id = v_person_id;

  insert into public.crm_event_rsvps (
    event_id,
    person_id,
    status,
    responded_at,
    updated_at
  )
  values (
    p_event_id,
    v_person_id,
    v_status,
    clock_timestamp(),
    clock_timestamp()
  )
  on conflict (event_id, person_id)
  do update set
    status = excluded.status,
    updated_at = clock_timestamp();

  if v_previous is distinct from v_status then
    insert into public.activities (person_id, activity_type, metadata)
    values (
      v_person_id,
      case
        when v_status = 'going'::public.crm_event_rsvp_status
          then 'supporter_event_rsvp'
        else 'supporter_event_rsvp_cancelled'
      end,
      jsonb_build_object('event_id', p_event_id, 'source', 'supporter_portal')
    );
  end if;

  return v_status;
end;
$$;

revoke all on function public.set_my_event_rsvp(uuid, boolean) from public, anon;
grant execute on function public.set_my_event_rsvp(uuid, boolean) to authenticated;

drop function if exists public.list_my_upcoming_events(integer);

create function public.list_my_upcoming_events(
  p_limit integer default 50
)
returns table (
  id uuid,
  title text,
  description text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  rsvp_status public.crm_event_rsvp_status
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
    e.ends_at,
    r.status
  from public.crm_events e
  left join public.crm_event_rsvps r
    on r.event_id = e.id
   and r.person_id = private.current_supporter_person_id()
  where private.is_supporter()
    and e.visibility in (
      'supporters'::public.crm_event_visibility,
      'public'::public.crm_event_visibility
    )
    and e.starts_at >= now()
  order by e.starts_at asc, e.id asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
$$;

revoke all on function public.list_my_upcoming_events(integer) from public, anon;
grant execute on function public.list_my_upcoming_events(integer) to authenticated;
