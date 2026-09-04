-- Let organizers choose event visibility atomically when creating an event.

drop function if exists public.create_crm_event(text, text, text, timestamptz, timestamptz);

create or replace function public.create_crm_event(
  p_title text,
  p_description text,
  p_location text,
  p_starts_at timestamptz,
  p_ends_at timestamptz default null,
  p_visibility public.crm_event_visibility default 'staff'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_id uuid;
begin
  v_actor := private.current_staff_user_id();
  if v_actor is null then
    raise exception 'active staff required' using errcode = '42501';
  end if;

  if nullif(trim(p_title), '') is null
    or length(trim(p_title)) > 160
    or p_starts_at is null
    or (p_ends_at is not null and p_ends_at <= p_starts_at)
  then
    raise exception 'invalid event details' using errcode = '22023';
  end if;

  insert into public.crm_events (
    title,
    description,
    location,
    starts_at,
    ends_at,
    created_by_staff_user_id,
    visibility
  )
  values (
    trim(p_title),
    nullif(trim(p_description), ''),
    nullif(trim(p_location), ''),
    p_starts_at,
    p_ends_at,
    v_actor,
    coalesce(p_visibility, 'staff'::public.crm_event_visibility)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_crm_event(
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  public.crm_event_visibility
) from public, anon;

grant execute on function public.create_crm_event(
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  public.crm_event_visibility
) to authenticated;
