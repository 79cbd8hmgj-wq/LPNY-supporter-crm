create or replace function public.process_get_involved_intake(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_normalized_email text,
  p_phone text,
  p_normalized_phone text,
  p_zip_code text,
  p_county_name text,
  p_municipality text,
  p_interest_slugs text[],
  p_email_opt_in boolean,
  p_phone_opt_in boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person_id uuid;
  v_phone_match_id uuid;
  v_source_id uuid;
  v_supporter_relationship_id uuid;
  v_county_id uuid;
  v_created boolean := false;
begin
  select id into v_source_id
  from public.sources
  where slug = 'website-get-involved' and active = true;

  if v_source_id is null then
    raise exception 'website-get-involved source is not configured';
  end if;

  select id into v_supporter_relationship_id
  from public.relationship_types
  where slug = 'supporter' and active = true;

  if v_supporter_relationship_id is null then
    raise exception 'supporter relationship is not configured';
  end if;

  if p_county_name is not null then
    select id into v_county_id
    from public.counties
    where lower(name) = lower(p_county_name)
    limit 1;
  end if;

  if p_normalized_email is not null then
    select id into v_person_id
    from public.people
    where normalized_email = p_normalized_email
      and archived_at is null
    limit 1;
  end if;

  if v_person_id is null and p_normalized_phone is not null then
    select id into v_person_id
    from public.people
    where normalized_phone = p_normalized_phone
      and lower(last_name) = lower(p_last_name)
      and archived_at is null
    order by created_at asc
    limit 1;
  end if;

  if v_person_id is null then
    insert into public.people (
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
      p_first_name,
      p_last_name,
      nullif(p_email, ''),
      p_normalized_email,
      nullif(p_phone, ''),
      p_normalized_phone,
      p_zip_code,
      v_county_id,
      p_municipality,
      'follow_up_needed'
    )
    returning id into v_person_id;

    v_created := true;

    if p_normalized_phone is not null then
      select id into v_phone_match_id
      from public.people
      where normalized_phone = p_normalized_phone
        and archived_at is null
        and id <> v_person_id
      order by created_at asc
      limit 1;

      if v_phone_match_id is not null and not exists (
        select 1
        from public.duplicate_candidates
        where status = 'open'
          and least(person_a_id, person_b_id) = least(v_phone_match_id, v_person_id)
          and greatest(person_a_id, person_b_id) = greatest(v_phone_match_id, v_person_id)
      ) then
        insert into public.duplicate_candidates (
          person_a_id,
          person_b_id,
          reason,
          confidence
        ) values (
          v_phone_match_id,
          v_person_id,
          'normalized_phone_match_without_name_match',
          0.9000
        );
      end if;
    end if;
  else
    update public.people
    set
      email = coalesce(email, nullif(p_email, '')),
      normalized_email = coalesce(normalized_email, p_normalized_email),
      phone = coalesce(phone, nullif(p_phone, '')),
      normalized_phone = coalesce(normalized_phone, p_normalized_phone),
      zip_code = p_zip_code,
      county_id = v_county_id,
      municipality = p_municipality,
      engagement_stage = case
        when engagement_stage in ('new', 'inactive') then 'follow_up_needed'::public.engagement_stage
        else engagement_stage
      end
    where id = v_person_id;
  end if;

  insert into public.person_relationships (person_id, relationship_type_id)
  values (v_person_id, v_supporter_relationship_id)
  on conflict do nothing;

  insert into public.person_interests (person_id, interest_id)
  select v_person_id, i.id
  from public.interests i
  where i.active = true
    and i.slug = any(coalesce(p_interest_slugs, '{}'::text[]))
  on conflict do nothing;

  insert into public.person_sources (person_id, source_id, metadata)
  values (
    v_person_id,
    v_source_id,
    jsonb_build_object('form_version', 'v1')
  );

  if p_email_opt_in and p_normalized_email is not null then
    insert into public.consent_events (person_id, channel, state, source_id, metadata)
    values (
      v_person_id,
      'email',
      'opted_in',
      v_source_id,
      jsonb_build_object('form_version', 'v1')
    );
  end if;

  if p_phone_opt_in and p_normalized_phone is not null then
    insert into public.consent_events (person_id, channel, state, source_id, metadata)
    values
      (v_person_id, 'sms', 'opted_in', v_source_id, jsonb_build_object('form_version', 'v1')),
      (v_person_id, 'phone', 'opted_in', v_source_id, jsonb_build_object('form_version', 'v1'));
  end if;

  insert into public.activities (person_id, activity_type, metadata)
  values (
    v_person_id,
    'form_submitted',
    jsonb_build_object(
      'source', 'website-get-involved',
      'form_version', 'v1',
      'created_person', v_created
    )
  );

  if not exists (
    select 1
    from public.tasks
    where person_id = v_person_id
      and task_type = 'initial_follow_up'
      and status = 'open'
  ) then
    insert into public.tasks (
      person_id,
      queue_scope,
      queue_county_id,
      task_type,
      due_at,
      priority,
      status
    ) values (
      v_person_id,
      case when v_county_id is null then 'statewide'::public.task_queue_scope else 'county'::public.task_queue_scope end,
      v_county_id,
      'initial_follow_up',
      now() + interval '24 hours',
      'normal',
      'open'
    );
  end if;

  return v_person_id;
end;
$$;

revoke all on function public.process_get_involved_intake(text, text, text, text, text, text, text, text, text, text[], boolean, boolean) from public;
revoke all on function public.process_get_involved_intake(text, text, text, text, text, text, text, text, text, text[], boolean, boolean) from anon;
revoke all on function public.process_get_involved_intake(text, text, text, text, text, text, text, text, text, text[], boolean, boolean) from authenticated;
grant execute on function public.process_get_involved_intake(text, text, text, text, text, text, text, text, text, text[], boolean, boolean) to service_role;
