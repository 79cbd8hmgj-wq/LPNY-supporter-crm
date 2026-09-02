create or replace function public.admin_find_csv_import_matches(
  p_normalized_emails text[],
  p_normalized_phones text[]
)
returns table (
  id uuid,
  first_name text,
  last_name text,
  normalized_email text,
  normalized_phone text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.current_staff_role() <> 'admin' then
    raise exception 'Admin role required' using errcode = '42501';
  end if;

  if coalesce(cardinality(p_normalized_emails), 0) > 5000
     or coalesce(cardinality(p_normalized_phones), 0) > 5000 then
    raise exception 'CSV preview lookup is limited to 5000 contact values' using errcode = '22023';
  end if;

  return query
  with requested_emails as (
    select distinct lower(trim(value)) as value
    from unnest(coalesce(p_normalized_emails, '{}'::text[])) as requested(value)
    where nullif(trim(value), '') is not null
  ),
  requested_phones as (
    select distinct regexp_replace(value, '\D', '', 'g') as value
    from unnest(coalesce(p_normalized_phones, '{}'::text[])) as requested(value)
    where nullif(regexp_replace(value, '\D', '', 'g'), '') is not null
  )
  select
    p.id,
    p.first_name,
    p.last_name,
    p.normalized_email,
    p.normalized_phone
  from public.people p
  where p.archived_at is null
    and p.merged_into_person_id is null
    and (
      exists (
        select 1
        from requested_emails e
        where p.normalized_email = e.value
      )
      or exists (
        select 1
        from requested_phones ph
        where p.normalized_phone = ph.value
      )
    )
  order by p.id;
end;
$$;

revoke all on function public.admin_find_csv_import_matches(text[], text[]) from public, anon;
grant execute on function public.admin_find_csv_import_matches(text[], text[]) to authenticated;
