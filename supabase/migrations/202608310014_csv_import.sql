insert into public.sources (slug, category, name, active)
values ('csv-import', 'import', 'CSV Import', true)
on conflict (slug) do update
set category = excluded.category,
    name = excluded.name,
    active = true;

create or replace function public.apply_csv_import(
  p_filename text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_batch_id uuid := gen_random_uuid();
  v_csv_source_id uuid;
  v_row jsonb;
  v_row_count integer;
  v_row_number integer;
  v_decision text;
  v_person_id uuid;
  v_requested_person_id uuid;
  v_first_name text;
  v_last_name text;
  v_email text;
  v_normalized_email text;
  v_phone text;
  v_normalized_phone text;
  v_zip_code text;
  v_county_name text;
  v_county_id uuid;
  v_municipality text;
  v_engagement_stage public.engagement_stage;
  v_relationship text;
  v_relationship_id uuid;
  v_declared_source text;
  v_declared_source_id uuid;
  v_taxonomy_value text;
  v_interest_id uuid;
  v_tag_id uuid;
  v_imported integer := 0;
  v_updated integer := 0;
  v_skipped integer := 0;
begin
  v_actor_id := private.current_staff_user_id();
  if v_actor_id is null or private.current_staff_role() is distinct from 'admin'::public.staff_role then
    raise exception 'admin role required for CSV import' using errcode = '42501';
  end if;

  if p_filename is null or length(trim(p_filename)) = 0 or length(trim(p_filename)) > 255 then
    raise exception 'CSV filename must contain 1 to 255 characters' using errcode = '22023';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'CSV import rows must be a JSON array' using errcode = '22023';
  end if;

  v_row_count := jsonb_array_length(p_rows);
  if v_row_count > 5000 then
    raise exception 'CSV import cannot exceed 5000 rows' using errcode = '22023';
  end if;

  select s.id into v_csv_source_id
  from public.sources s
  where s.slug = 'csv-import'
    and s.active = true
  limit 1;

  if v_csv_source_id is null then
    raise exception 'csv-import source is not configured';
  end if;

  for v_row in
    select value from jsonb_array_elements(p_rows) as import_rows(value)
  loop
    if jsonb_typeof(v_row) <> 'object' then
      raise exception 'each CSV import row must be a JSON object' using errcode = '22023';
    end if;

    v_decision := nullif(trim(v_row->>'decision'), '');
    if v_decision = 'skip' then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    if v_decision is null or v_decision not in ('create_new', 'update_existing') then
      raise exception 'CSV row decision is invalid' using errcode = '22023';
    end if;

    v_first_name := trim(coalesce(v_row->>'first_name', ''));
    v_last_name := trim(coalesce(v_row->>'last_name', ''));
    v_email := nullif(trim(v_row->>'email'), '');
    v_normalized_email := nullif(trim(v_row->>'normalized_email'), '');
    v_phone := nullif(trim(v_row->>'phone'), '');
    v_normalized_phone := nullif(trim(v_row->>'normalized_phone'), '');
    v_zip_code := nullif(trim(v_row->>'zip_code'), '');
    v_county_name := nullif(trim(v_row->>'county_name'), '');
    v_municipality := nullif(trim(v_row->>'municipality'), '');
    v_relationship := nullif(trim(v_row->>'relationship'), '');
    v_declared_source := nullif(trim(v_row->>'source'), '');

    begin
      v_row_number := nullif(trim(v_row->>'row_number'), '')::integer;
    exception when invalid_text_representation then
      raise exception 'CSV row number is invalid' using errcode = '22023';
    end;

    if length(v_first_name) = 0 or length(v_first_name) > 80 then
      raise exception 'CSV row first name is invalid' using errcode = '22023';
    end if;
    if length(v_last_name) = 0 or length(v_last_name) > 80 then
      raise exception 'CSV row last name is invalid' using errcode = '22023';
    end if;
    if v_email is null and v_phone is null then
      raise exception 'CSV row requires email or phone' using errcode = '22023';
    end if;
    if (v_email is null) <> (v_normalized_email is null) then
      raise exception 'CSV row email and normalized email must be supplied together' using errcode = '22023';
    end if;
    if v_normalized_email is not null and v_normalized_email <> lower(v_normalized_email) then
      raise exception 'CSV row normalized email must be lowercase' using errcode = '22023';
    end if;
    if (v_phone is null) <> (v_normalized_phone is null) then
      raise exception 'CSV row phone and normalized phone must be supplied together' using errcode = '22023';
    end if;
    if v_normalized_phone is not null and v_normalized_phone !~ '^[0-9]{7,15}$' then
      raise exception 'CSV row normalized phone is invalid' using errcode = '22023';
    end if;
    if v_zip_code is not null and v_zip_code !~ '^[0-9]{5}$' then
      raise exception 'CSV row ZIP code is invalid' using errcode = '22023';
    end if;

    begin
      v_engagement_stage := coalesce(nullif(trim(v_row->>'engagement_stage'), ''), 'new')::public.engagement_stage;
    exception when invalid_text_representation then
      raise exception 'CSV row engagement stage is invalid' using errcode = '22023';
    end;

    v_county_id := null;
    if v_county_name is not null then
      select c.id into v_county_id
      from public.counties c
      where lower(c.name) = lower(v_county_name)
      limit 1;

      if v_county_id is null then
        raise exception 'CSV row county does not exist' using errcode = '22023';
      end if;
    end if;

    if v_decision = 'create_new' then
      v_person_id := gen_random_uuid();
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
        v_first_name,
        v_last_name,
        v_email,
        v_normalized_email,
        v_phone,
        v_normalized_phone,
        v_zip_code,
        v_county_id,
        v_municipality,
        v_engagement_stage
      );
      v_imported := v_imported + 1;
    else
      begin
        v_requested_person_id := nullif(trim(v_row->>'existing_person_id'), '')::uuid;
      exception when invalid_text_representation then
        raise exception 'CSV row existing person id is invalid' using errcode = '22023';
      end;

      if v_requested_person_id is null then
        raise exception 'CSV update row requires an existing person id' using errcode = '22023';
      end if;

      select p.id into v_person_id
      from public.people p
      where p.id = v_requested_person_id
        and p.archived_at is null
        and p.merged_into_person_id is null
      for update;

      if v_person_id is null then
        raise exception 'CSV update target does not exist' using errcode = '22023';
      end if;

      update public.people
      set email = coalesce(email, v_email),
          normalized_email = coalesce(normalized_email, v_normalized_email),
          phone = coalesce(phone, v_phone),
          normalized_phone = coalesce(normalized_phone, v_normalized_phone),
          zip_code = coalesce(zip_code, v_zip_code),
          county_id = coalesce(county_id, v_county_id),
          municipality = coalesce(municipality, v_municipality)
      where id = v_person_id;

      v_updated := v_updated + 1;
    end if;

    insert into public.person_sources (person_id, source_id, metadata)
    values (
      v_person_id,
      v_csv_source_id,
      jsonb_build_object(
        'entry_method', 'csv_import',
        'batch_id', v_batch_id,
        'row_number', v_row_number
      )
    );

    if v_declared_source is not null then
      select s.id into v_declared_source_id
      from public.sources s
      where s.active = true
        and (
          lower(s.slug) = lower(v_declared_source)
          or lower(s.name) = lower(v_declared_source)
        )
      order by case when lower(s.slug) = lower(v_declared_source) then 0 else 1 end, s.id
      limit 1;

      if v_declared_source_id is null then
        raise exception 'CSV row source is not configured' using errcode = '22023';
      end if;

      if v_declared_source_id <> v_csv_source_id then
        insert into public.person_sources (person_id, source_id, metadata)
        values (
          v_person_id,
          v_declared_source_id,
          jsonb_build_object(
            'entry_method', 'csv_import_declared_source',
            'batch_id', v_batch_id,
            'row_number', v_row_number
          )
        );
      end if;
    end if;

    if v_relationship is not null then
      select rt.id into v_relationship_id
      from public.relationship_types rt
      where rt.active = true
        and (
          lower(rt.slug) = lower(v_relationship)
          or lower(rt.name) = lower(v_relationship)
        )
      order by case when lower(rt.slug) = lower(v_relationship) then 0 else 1 end, rt.id
      limit 1;

      if v_relationship_id is null then
        raise exception 'CSV row relationship is not configured' using errcode = '22023';
      end if;

      insert into public.person_relationships (person_id, relationship_type_id)
      values (v_person_id, v_relationship_id)
      on conflict do nothing;
    end if;

    if v_row ? 'interests' and coalesce(jsonb_typeof(v_row->'interests'), 'null') not in ('array', 'null') then
      raise exception 'CSV row interests must be an array' using errcode = '22023';
    end if;

    if jsonb_typeof(v_row->'interests') = 'array' then
      for v_taxonomy_value in
        select trim(value) from jsonb_array_elements_text(v_row->'interests') as requested(value)
      loop
        if length(v_taxonomy_value) = 0 then
          continue;
        end if;

        select i.id into v_interest_id
        from public.interests i
        where i.active = true
          and (
            lower(i.slug) = lower(v_taxonomy_value)
            or lower(i.name) = lower(v_taxonomy_value)
          )
        order by case when lower(i.slug) = lower(v_taxonomy_value) then 0 else 1 end, i.id
        limit 1;

        if v_interest_id is null then
          raise exception 'CSV row interest is not configured' using errcode = '22023';
        end if;

        insert into public.person_interests (person_id, interest_id)
        values (v_person_id, v_interest_id)
        on conflict do nothing;
      end loop;
    end if;

    if v_row ? 'tags' and coalesce(jsonb_typeof(v_row->'tags'), 'null') not in ('array', 'null') then
      raise exception 'CSV row tags must be an array' using errcode = '22023';
    end if;

    if jsonb_typeof(v_row->'tags') = 'array' then
      for v_taxonomy_value in
        select trim(value) from jsonb_array_elements_text(v_row->'tags') as requested(value)
      loop
        if length(v_taxonomy_value) = 0 then
          continue;
        end if;

        select t.id into v_tag_id
        from public.tags t
        where t.active = true
          and lower(t.name) = lower(v_taxonomy_value)
        order by t.id
        limit 1;

        if v_tag_id is null then
          raise exception 'CSV row tag is not configured' using errcode = '22023';
        end if;

        insert into public.person_tags (person_id, tag_id)
        values (v_person_id, v_tag_id)
        on conflict do nothing;
      end loop;
    end if;

    insert into public.activities (
      person_id,
      activity_type,
      actor_staff_user_id,
      metadata
    ) values (
      v_person_id,
      'csv_imported',
      v_actor_id,
      jsonb_build_object(
        'batch_id', v_batch_id,
        'row_number', v_row_number,
        'decision', v_decision
      )
    );
  end loop;

  perform private.append_admin_audit(
    'csv_import_applied',
    'csv_import',
    null,
    jsonb_build_object(
      'batch_id', v_batch_id,
      'row_count', v_row_count,
      'imported_count', v_imported,
      'updated_count', v_updated,
      'skipped_count', v_skipped
    )
  );

  return jsonb_build_object(
    'batch_id', v_batch_id,
    'row_count', v_row_count,
    'imported', v_imported,
    'updated', v_updated,
    'skipped', v_skipped
  );
end;
$$;

revoke all on function public.apply_csv_import(text, jsonb) from public, anon;
grant execute on function public.apply_csv_import(text, jsonb) to authenticated;
