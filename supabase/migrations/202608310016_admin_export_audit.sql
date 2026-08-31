create or replace function public.admin_record_people_csv_export(
  p_row_count integer,
  p_active_filter_keys text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowed_keys constant text[] := array[
    'query',
    'county',
    'zip',
    'stage',
    'relationship',
    'interest',
    'tag',
    'organizer',
    'source',
    'joinedAfter',
    'joinedBefore',
    'inactiveDays',
    'openTask',
    'candidateInterest',
    'memberStatus'
  ]::text[];
  v_filter_keys text[];
  v_audit_id uuid;
begin
  if private.current_staff_role() <> 'admin'::public.staff_role then
    raise exception 'Admin role required' using errcode = '42501';
  end if;

  if p_row_count is null or p_row_count < 0 then
    raise exception 'CSV export row count must be a non-negative integer' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_active_filter_keys, '{}'::text[])) as requested(filter_key)
    where requested.filter_key is null
       or not (requested.filter_key = any(v_allowed_keys))
  ) then
    raise exception 'CSV export audit contains an unsupported filter key' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct requested.filter_key order by requested.filter_key), '{}'::text[])
  into v_filter_keys
  from unnest(coalesce(p_active_filter_keys, '{}'::text[])) as requested(filter_key);

  v_audit_id := private.append_admin_audit(
    'people_csv_exported',
    'people_export',
    null,
    jsonb_build_object(
      'row_count', p_row_count,
      'active_filter_keys', to_jsonb(v_filter_keys)
    )
  );

  return v_audit_id;
end;
$$;

revoke all on function public.admin_record_people_csv_export(integer, text[]) from public, anon;
grant execute on function public.admin_record_people_csv_export(integer, text[]) to authenticated;
