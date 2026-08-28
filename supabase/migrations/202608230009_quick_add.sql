insert into public.sources (slug, category, name)
values ('organizer-entry', 'organizer', 'Organizer Entry')
on conflict (slug) do update
set category = excluded.category,
    name = excluded.name,
    active = true;

create or replace function public.find_quick_add_candidates(
  p_first_name text,
  p_last_name text,
  p_normalized_email text,
  p_normalized_phone text,
  p_zip_code text
)
returns table (
  id uuid,
  first_name text,
  last_name text,
  email text,
  normalized_email text,
  phone text,
  normalized_phone text,
  zip_code text,
  county_id uuid,
  county_name text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.normalized_email,
    p.phone,
    p.normalized_phone,
    p.zip_code,
    p.county_id,
    c.name as county_name
  from public.people p
  left join public.counties c on c.id = p.county_id
  where p.archived_at is null
    and (
      (p_normalized_email is not null and p.normalized_email = p_normalized_email)
      or (p_normalized_phone is not null and p.normalized_phone = p_normalized_phone)
      or (
        p_zip_code is not null
        and p.zip_code = p_zip_code
        and lower(trim(p.first_name)) = lower(trim(p_first_name))
        and lower(trim(p.last_name)) = lower(trim(p_last_name))
      )
    )
  order by p.created_at asc, p.id asc
  limit 20
$$;

revoke all on function public.find_quick_add_candidates(text, text, text, text, text) from public;
revoke all on function public.find_quick_add_candidates(text, text, text, text, text) from anon;
grant execute on function public.find_quick_add_candidates(text, text, text, text, text) to authenticated;

create or replace function public.create_quick_add_person(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_normalized_email text,
  p_phone text,
  p_normalized_phone text,
  p_zip_code text,
  p_county_name text,
  p_municipality text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_person_id uuid := gen_random_uuid();
  v_county_id uuid;
  v_source_id uuid;
  v_supporter_relationship_id uuid;
  v_actor_staff_user_id uuid;
begin
  v_actor_staff_user_id := private.current_staff_user_id();

  if v_actor_staff_user_id is null then
    raise insufficient_privilege using message = 'Quick Add requires an active staff account';
  end if;

  if p_county_name is not null then
    select c.id into v_county_id
    from public.counties c
    where lower(c.name) = lower(p_county_name)
    limit 1;
  end if;

  select s.id into v_source_id
  from public.sources s
  where s.slug = 'organizer-entry'
    and s.active = true
  limit 1;

  if v_source_id is null then
    raise exception 'organizer-entry source is not configured';
  end if;

  select rt.id into v_supporter_relationship_id
  from public.relationship_types rt
  where rt.slug = 'supporter'
    and rt.active = true
  limit 1;

  if v_supporter_relationship_id is null then
    raise exception 'supporter relationship is not configured';
  end if;

  insert into public.people (
    id,
    first_name,
    last_name,
    email,
    normalized_email,
    phone,
    normalized_phone,
    zip_code,
    county_id,
    municipality,
    engagement_stage
  ) values (
    v_person_id,
    p_first_name,
    p_last_name,
    nullif(p_email, ''),
    p_normalized_email,
    nullif(p_phone, ''),
    p_normalized_phone,
    p_zip_code,
    v_county_id,
    nullif(p_municipality, ''),
    'follow_up_needed'
  );

  insert into public.person_relationships (person_id, relationship_type_id)
  values (v_person_id, v_supporter_relationship_id)
  on conflict do nothing;

  insert into public.person_sources (person_id, source_id, metadata)
  values (
    v_person_id,
    v_source_id,
    jsonb_build_object('entry_method', 'quick_add')
  );

  insert into public.activities (
    person_id,
    activity_type,
    actor_staff_user_id,
    metadata
  ) values (
    v_person_id,
    'organizer_entry',
    v_actor_staff_user_id,
    jsonb_build_object('source', 'organizer-entry')
  );

  insert into public.tasks (
    person_id,
    queue_scope,
    queue_county_id,
    task_type,
    due_at,
    priority,
    status,
    created_by_staff_user_id
  ) values (
    v_person_id,
    case
      when v_county_id is null then 'statewide'::public.task_queue_scope
      else 'county'::public.task_queue_scope
    end,
    v_county_id,
    'initial_follow_up',
    now() + interval '24 hours',
    'normal',
    'open',
    v_actor_staff_user_id
  );

  return v_person_id;
end;
$$;

revoke all on function public.create_quick_add_person(text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.create_quick_add_person(text, text, text, text, text, text, text, text, text) from anon;
grant execute on function public.create_quick_add_person(text, text, text, text, text, text, text, text, text) to authenticated;
