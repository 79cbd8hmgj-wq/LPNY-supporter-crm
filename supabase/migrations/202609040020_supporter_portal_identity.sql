-- Supporter-facing identity foundation.
-- Authenticated supporters are linked to exactly one canonical people record, but
-- do not receive direct access to the internal CRM row. Safe portal data is
-- exposed through narrowly scoped SECURITY DEFINER functions.

create table public.supporter_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  person_id uuid not null unique references public.people(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.supporter_accounts enable row level security;

revoke all on table public.supporter_accounts from public, anon, authenticated;
grant select on table public.supporter_accounts to authenticated;
grant select, insert, update, delete on table public.supporter_accounts to service_role;

create policy supporter_accounts_self_read
on public.supporter_accounts
for select
to authenticated
using (auth_user_id = auth.uid());

create or replace function private.current_supporter_person_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select sa.person_id
  from public.supporter_accounts sa
  where sa.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function private.is_supporter()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_supporter_person_id() is not null
$$;

revoke all on function private.current_supporter_person_id() from public;
revoke all on function private.is_supporter() from public;
grant execute on function private.current_supporter_person_id() to authenticated;
grant execute on function private.is_supporter() to authenticated;

create or replace function public.claim_supporter_account()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_email text;
  v_person_id uuid;
  v_existing_person_id uuid;
begin
  if v_auth_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select nullif(lower(trim(auth.jwt() ->> 'email')), '')
    into v_email;

  if v_email is null then
    raise exception 'verified email required' using errcode = '42501';
  end if;

  select sa.person_id
    into v_existing_person_id
  from public.supporter_accounts sa
  where sa.auth_user_id = v_auth_user_id;

  if v_existing_person_id is not null then
    return v_existing_person_id;
  end if;

  select p.id
    into v_person_id
  from public.people p
  where p.normalized_email = v_email
    and p.archived_at is null
  limit 1;

  if v_person_id is null then
    raise exception 'matching supporter record required' using errcode = 'P0002';
  end if;

  begin
    insert into public.supporter_accounts (auth_user_id, person_id)
    values (v_auth_user_id, v_person_id);
  exception
    when unique_violation then
      select sa.person_id
        into v_existing_person_id
      from public.supporter_accounts sa
      where sa.auth_user_id = v_auth_user_id;

      if v_existing_person_id is not null then
        return v_existing_person_id;
      end if;

      raise exception 'supporter record already claimed' using errcode = '42501';
  end;

  return v_person_id;
end;
$$;

revoke all on function public.claim_supporter_account() from public, anon;
grant execute on function public.claim_supporter_account() to authenticated;

create or replace function public.get_my_supporter_profile()
returns table (
  person_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  zip_code text,
  county_name text,
  municipality text,
  interests text[],
  email_opt_in boolean,
  sms_opt_in boolean,
  phone_opt_in boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.zip_code,
    c.name,
    p.municipality,
    coalesce(
      (
        select array_agg(i.name order by i.name)
        from public.person_interests pi
        join public.interests i on i.id = pi.interest_id
        where pi.person_id = p.id
          and i.active
      ),
      '{}'::text[]
    ),
    coalesce(
      (
        select ce.state = 'opted_in'::public.consent_state
        from public.consent_events ce
        where ce.person_id = p.id
          and ce.channel = 'email'::public.consent_channel
        order by ce.effective_at desc, ce.id desc
        limit 1
      ),
      false
    ),
    coalesce(
      (
        select ce.state = 'opted_in'::public.consent_state
        from public.consent_events ce
        where ce.person_id = p.id
          and ce.channel = 'sms'::public.consent_channel
        order by ce.effective_at desc, ce.id desc
        limit 1
      ),
      false
    ),
    coalesce(
      (
        select ce.state = 'opted_in'::public.consent_state
        from public.consent_events ce
        where ce.person_id = p.id
          and ce.channel = 'phone'::public.consent_channel
        order by ce.effective_at desc, ce.id desc
        limit 1
      ),
      false
    )
  from public.people p
  left join public.counties c on c.id = p.county_id
  where p.id = private.current_supporter_person_id()
    and p.archived_at is null
$$;

revoke all on function public.get_my_supporter_profile() from public, anon;
grant execute on function public.get_my_supporter_profile() to authenticated;
