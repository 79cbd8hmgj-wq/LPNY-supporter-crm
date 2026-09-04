-- Require an active Supporter relationship for all supporter-portal access.
-- Account mappings are retained for identity continuity, but become invisible and
-- unusable immediately when the linked person is no longer an active supporter.

create or replace function private.current_supporter_person_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select sa.person_id
  from public.supporter_accounts sa
  join public.people p
    on p.id = sa.person_id
   and p.archived_at is null
  where sa.auth_user_id = auth.uid()
    and exists (
      select 1
      from public.person_relationships pr
      join public.relationship_types rt
        on rt.id = pr.relationship_type_id
      where pr.person_id = sa.person_id
        and rt.slug = 'supporter'
        and rt.active
    )
  limit 1
$$;

drop policy if exists supporter_accounts_self_read on public.supporter_accounts;

create policy supporter_accounts_self_read
on public.supporter_accounts
for select
to authenticated
using (
  auth_user_id = auth.uid()
  and person_id = private.current_supporter_person_id()
);

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
  join public.people p
    on p.id = sa.person_id
   and p.archived_at is null
  where sa.auth_user_id = v_auth_user_id
    and exists (
      select 1
      from public.person_relationships pr
      join public.relationship_types rt
        on rt.id = pr.relationship_type_id
      where pr.person_id = sa.person_id
        and rt.slug = 'supporter'
        and rt.active
    );

  if v_existing_person_id is not null then
    return v_existing_person_id;
  end if;

  select p.id
    into v_person_id
  from public.people p
  where p.normalized_email = v_email
    and p.archived_at is null
    and exists (
      select 1
      from public.person_relationships pr
      join public.relationship_types rt
        on rt.id = pr.relationship_type_id
      where pr.person_id = p.id
        and rt.slug = 'supporter'
        and rt.active
    )
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

      if v_existing_person_id is not null
        and v_existing_person_id = v_person_id
      then
        return v_existing_person_id;
      end if;

      raise exception 'supporter record already claimed' using errcode = '42501';
  end;

  return v_person_id;
end;
$$;

revoke all on function public.claim_supporter_account() from public, anon;
grant execute on function public.claim_supporter_account() to authenticated;
