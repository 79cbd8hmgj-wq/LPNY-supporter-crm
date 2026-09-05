-- Verified supporter email self-service.
-- The Auth email is the source of truth after Supabase completes its email-change
-- confirmation flow. This RPC synchronizes only the currently linked supporter
-- record and never permits choosing an arbitrary person or email.

create or replace function public.sync_my_supporter_email()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person_id uuid;
  v_email text;
  v_existing_email text;
begin
  v_person_id := private.current_supporter_person_id();
  if v_person_id is null then
    raise exception 'supporter account required' using errcode = '42501';
  end if;

  select nullif(lower(trim(auth.jwt() ->> 'email')), '')
    into v_email;

  if v_email is null then
    raise exception 'verified email required' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.people p
    where p.normalized_email = v_email
      and p.id <> v_person_id
      and p.archived_at is null
  ) then
    raise exception 'email already belongs to another supporter' using errcode = '23505';
  end if;

  select p.normalized_email
    into v_existing_email
  from public.people p
  where p.id = v_person_id
    and p.archived_at is null
  for update;

  if not found then
    raise exception 'supporter record unavailable' using errcode = 'P0002';
  end if;

  if v_existing_email is distinct from v_email then
    update public.people
       set email = v_email,
           normalized_email = v_email
     where id = v_person_id;

    insert into public.activities (person_id, activity_type, metadata)
    values (
      v_person_id,
      'supporter_email_updated',
      jsonb_build_object('source', 'supporter_portal')
    );
  end if;

  return v_email;
end;
$$;

revoke all on function public.sync_my_supporter_email() from public, anon;
grant execute on function public.sync_my_supporter_email() to authenticated;
