create or replace function public.admin_register_staff_user(
  p_auth_user_id uuid,
  p_display_name text,
  p_role public.staff_role,
  p_county_ids uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_staff_user_id uuid;
  normalized_county_ids uuid[];
begin
  if private.current_staff_role() is distinct from 'admin'::public.staff_role then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  if p_auth_user_id is null or not exists (
    select 1 from auth.users au where au.id = p_auth_user_id
  ) then
    raise exception 'auth user does not exist' using errcode = '22023';
  end if;

  if p_display_name is null or length(trim(p_display_name)) = 0 then
    raise exception 'display name is required' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct county_id order by county_id), '{}'::uuid[])
  into normalized_county_ids
  from unnest(coalesce(p_county_ids, '{}'::uuid[])) as requested(county_id)
  where county_id is not null;

  if cardinality(normalized_county_ids) <> cardinality(coalesce(p_county_ids, '{}'::uuid[])) then
    raise exception 'county assignments must contain unique non-null county ids' using errcode = '22023';
  end if;

  if p_role = 'county_organizer'::public.staff_role then
    if cardinality(normalized_county_ids) = 0 then
      raise exception 'county organizers require at least one county' using errcode = '22023';
    end if;
  elsif cardinality(normalized_county_ids) <> 0 then
    raise exception 'only county organizers may have county assignments' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(normalized_county_ids) requested(county_id)
    left join public.counties c on c.id = requested.county_id
    where c.id is null
  ) then
    raise exception 'one or more county assignments do not exist' using errcode = '22023';
  end if;

  insert into public.staff_users (
    auth_user_id,
    display_name,
    role,
    status,
    invited_at
  ) values (
    p_auth_user_id,
    trim(p_display_name),
    p_role,
    'active'::public.staff_status,
    now()
  )
  returning id into new_staff_user_id;

  insert into public.staff_counties (staff_user_id, county_id)
  select new_staff_user_id, county_id
  from unnest(normalized_county_ids) requested(county_id);

  perform private.append_admin_audit(
    'staff_registered',
    'staff_user',
    new_staff_user_id,
    jsonb_build_object(
      'role', p_role::text,
      'county_count', cardinality(normalized_county_ids)
    )
  );

  return new_staff_user_id;
end;
$$;

create or replace function public.admin_update_staff_access(
  p_staff_user_id uuid,
  p_role public.staff_role,
  p_status public.staff_status,
  p_county_ids uuid[] default '{}'::uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_role public.staff_role;
  old_status public.staff_status;
  old_county_ids uuid[];
  normalized_county_ids uuid[];
begin
  if private.current_staff_role() is distinct from 'admin'::public.staff_role then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  select su.role, su.status
  into old_role, old_status
  from public.staff_users su
  where su.id = p_staff_user_id
  for update;

  if not found then
    raise exception 'staff user does not exist' using errcode = '22023';
  end if;

  select coalesce(array_agg(sc.county_id order by sc.county_id), '{}'::uuid[])
  into old_county_ids
  from public.staff_counties sc
  where sc.staff_user_id = p_staff_user_id;

  select coalesce(array_agg(distinct county_id order by county_id), '{}'::uuid[])
  into normalized_county_ids
  from unnest(coalesce(p_county_ids, '{}'::uuid[])) as requested(county_id)
  where county_id is not null;

  if cardinality(normalized_county_ids) <> cardinality(coalesce(p_county_ids, '{}'::uuid[])) then
    raise exception 'county assignments must contain unique non-null county ids' using errcode = '22023';
  end if;

  if p_role = 'county_organizer'::public.staff_role then
    if cardinality(normalized_county_ids) = 0 then
      raise exception 'county organizers require at least one county' using errcode = '22023';
    end if;
  elsif cardinality(normalized_county_ids) <> 0 then
    raise exception 'only county organizers may have county assignments' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(normalized_county_ids) requested(county_id)
    left join public.counties c on c.id = requested.county_id
    where c.id is null
  ) then
    raise exception 'one or more county assignments do not exist' using errcode = '22023';
  end if;

  update public.staff_users
  set role = p_role,
      status = p_status
  where id = p_staff_user_id;

  delete from public.staff_counties
  where staff_user_id = p_staff_user_id;

  insert into public.staff_counties (staff_user_id, county_id)
  select p_staff_user_id, county_id
  from unnest(normalized_county_ids) requested(county_id);

  if old_role is distinct from p_role then
    perform private.append_admin_audit(
      'staff_role_changed',
      'staff_user',
      p_staff_user_id,
      jsonb_build_object('from', old_role::text, 'to', p_role::text)
    );
  end if;

  if old_status is distinct from p_status then
    perform private.append_admin_audit(
      'staff_status_changed',
      'staff_user',
      p_staff_user_id,
      jsonb_build_object('from', old_status::text, 'to', p_status::text)
    );
  end if;

  if old_county_ids is distinct from normalized_county_ids then
    perform private.append_admin_audit(
      'staff_counties_changed',
      'staff_user',
      p_staff_user_id,
      jsonb_build_object(
        'from_count', cardinality(old_county_ids),
        'to_count', cardinality(normalized_county_ids)
      )
    );
  end if;
end;
$$;

revoke all on function public.admin_register_staff_user(uuid, text, public.staff_role, uuid[]) from public;
revoke all on function public.admin_update_staff_access(uuid, public.staff_role, public.staff_status, uuid[]) from public;
grant execute on function public.admin_register_staff_user(uuid, text, public.staff_role, uuid[]) to authenticated;
grant execute on function public.admin_update_staff_access(uuid, public.staff_role, public.staff_status, uuid[]) to authenticated;
