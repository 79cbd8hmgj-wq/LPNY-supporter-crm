-- Duplicate resolution is a sensitive Admin/State Organizer workflow. Candidate rows
-- remain readable to those roles, but application callers may only resolve them through
-- the audited transaction below; direct candidate writes are removed.

alter table public.people
  add column merged_into_person_id uuid references public.people(id) on delete restrict;

alter table public.people
  add constraint people_merged_into_not_self
  check (merged_into_person_id is null or merged_into_person_id <> id);

create index people_merged_into_person_id_idx
  on public.people (merged_into_person_id)
  where merged_into_person_id is not null;

revoke insert, update, delete, truncate, references, trigger
  on table public.duplicate_candidates from authenticated;
grant select on table public.duplicate_candidates to authenticated, service_role;
grant insert, update, delete on table public.duplicate_candidates to service_role;

drop policy if exists duplicate_candidates_insert on public.duplicate_candidates;
drop policy if exists duplicate_candidates_update on public.duplicate_candidates;

create or replace function private.require_duplicate_manager()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  actor_role public.staff_role;
begin
  actor_id := private.current_staff_user_id();
  actor_role := private.current_staff_role();

  if actor_id is null or actor_role not in ('admin', 'state_organizer') then
    raise exception 'duplicate resolution requires Admin or State Organizer access'
      using errcode = '42501';
  end if;

  return actor_id;
end;
$$;

revoke all on function private.require_duplicate_manager() from public, anon, authenticated;

create or replace function public.resolve_duplicate_candidate(
  p_candidate_id uuid,
  p_resolution text,
  p_primary_person_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  candidate_record public.duplicate_candidates%rowtype;
  primary_person public.people%rowtype;
  secondary_person public.people%rowtype;
  secondary_person_id uuid;
  normalized_resolution text;
begin
  actor_id := private.require_duplicate_manager();
  normalized_resolution := lower(trim(p_resolution));

  if p_candidate_id is null then
    raise exception 'duplicate candidate id is required'
      using errcode = '22023';
  end if;

  if normalized_resolution not in ('keep_separate', 'merge') then
    raise exception 'duplicate resolution is invalid'
      using errcode = '22023';
  end if;

  select *
    into candidate_record
    from public.duplicate_candidates
   where id = p_candidate_id
   for update;

  if not found then
    raise exception 'duplicate candidate not found'
      using errcode = '22023';
  end if;

  if candidate_record.status <> 'open'::public.duplicate_status then
    raise exception 'duplicate candidate has already been reviewed'
      using errcode = '22023';
  end if;

  if normalized_resolution = 'keep_separate' then
    update public.duplicate_candidates
       set status = 'kept_separate'::public.duplicate_status,
           reviewed_at = now(),
           reviewed_by_staff_user_id = actor_id
     where id = candidate_record.id;

    perform private.append_admin_audit(
      'duplicate_kept_separate',
      'duplicate_candidate',
      candidate_record.id,
      jsonb_build_object(
        'person_a_id', candidate_record.person_a_id,
        'person_b_id', candidate_record.person_b_id
      )
    );

    return;
  end if;

  if p_primary_person_id is null
     or p_primary_person_id not in (candidate_record.person_a_id, candidate_record.person_b_id) then
    raise exception 'primary person must be one side of the duplicate candidate'
      using errcode = '22023';
  end if;

  secondary_person_id := case
    when p_primary_person_id = candidate_record.person_a_id then candidate_record.person_b_id
    else candidate_record.person_a_id
  end;

  -- Lock in deterministic order so two simultaneous duplicate resolutions cannot
  -- deadlock by selecting opposite canonical sides.
  perform 1
    from public.people
   where id in (p_primary_person_id, secondary_person_id)
   order by id
   for update;

  select * into primary_person
    from public.people
   where id = p_primary_person_id;

  select * into secondary_person
    from public.people
   where id = secondary_person_id;

  if primary_person.id is null or secondary_person.id is null then
    raise exception 'duplicate candidate references missing people'
      using errcode = '22023';
  end if;

  if primary_person.archived_at is not null or primary_person.merged_into_person_id is not null then
    raise exception 'canonical person must be an active unmerged record'
      using errcode = '22023';
  end if;

  if secondary_person.archived_at is not null or secondary_person.merged_into_person_id is not null then
    raise exception 'secondary person has already been archived or merged'
      using errcode = '22023';
  end if;

  -- Archive the secondary first. This removes it from the partial active-email
  -- uniqueness index before a missing canonical normalized email is transferred.
  update public.people
     set archived_at = now(),
         merged_into_person_id = primary_person.id
   where id = secondary_person.id;

  update public.people
     set email = coalesce(nullif(trim(email), ''), secondary_person.email),
         normalized_email = coalesce(normalized_email, secondary_person.normalized_email),
         phone = coalesce(nullif(trim(phone), ''), secondary_person.phone),
         normalized_phone = coalesce(normalized_phone, secondary_person.normalized_phone),
         zip_code = coalesce(zip_code, secondary_person.zip_code),
         county_id = coalesce(county_id, secondary_person.county_id),
         municipality = coalesce(nullif(trim(municipality), ''), secondary_person.municipality),
         assigned_staff_user_id = coalesce(assigned_staff_user_id, secondary_person.assigned_staff_user_id),
         do_not_contact = do_not_contact or secondary_person.do_not_contact,
         last_activity_at = case
           when last_activity_at is null then secondary_person.last_activity_at
           when secondary_person.last_activity_at is null then last_activity_at
           else greatest(last_activity_at, secondary_person.last_activity_at)
         end
   where id = primary_person.id;

  -- History rows are re-parented instead of copied so institutional history keeps
  -- its original timestamps and identifiers.
  update public.person_sources
     set person_id = primary_person.id
   where person_id = secondary_person.id;

  update public.activities
     set person_id = primary_person.id
   where person_id = secondary_person.id;

  update public.internal_notes
     set person_id = primary_person.id
   where person_id = secondary_person.id;

  update public.tasks
     set person_id = primary_person.id
   where person_id = secondary_person.id;

  update public.consent_events
     set person_id = primary_person.id
   where person_id = secondary_person.id;

  -- Join tables use union semantics: preserve the oldest association metadata where
  -- the canonical person already has the same key, then remove the secondary key.
  insert into public.person_relationships (person_id, relationship_type_id, created_at)
  select primary_person.id, relationship_type_id, created_at
    from public.person_relationships
   where person_id = secondary_person.id
  on conflict (person_id, relationship_type_id) do nothing;

  delete from public.person_relationships
   where person_id = secondary_person.id;

  insert into public.person_interests (person_id, interest_id, created_at)
  select primary_person.id, interest_id, created_at
    from public.person_interests
   where person_id = secondary_person.id
  on conflict (person_id, interest_id) do nothing;

  delete from public.person_interests
   where person_id = secondary_person.id;

  insert into public.person_tags (person_id, tag_id, created_at)
  select primary_person.id, tag_id, created_at
    from public.person_tags
   where person_id = secondary_person.id
  on conflict (person_id, tag_id) do nothing;

  delete from public.person_tags
   where person_id = secondary_person.id;

  insert into public.staff_person_assignments (staff_user_id, person_id, created_at)
  select staff_user_id, primary_person.id, created_at
    from public.staff_person_assignments
   where person_id = secondary_person.id
  on conflict (staff_user_id, person_id) do nothing;

  delete from public.staff_person_assignments
   where person_id = secondary_person.id;

  update public.duplicate_candidates
     set status = 'merged'::public.duplicate_status,
         reviewed_at = now(),
         reviewed_by_staff_user_id = actor_id
   where id = candidate_record.id;

  -- If another open candidate involving the secondary would collapse onto an
  -- already-open canonical pair, retire that redundant candidate as part of this
  -- merge. Otherwise point the open candidate at the canonical person.
  update public.duplicate_candidates dc
     set status = 'merged'::public.duplicate_status,
         reviewed_at = now(),
         reviewed_by_staff_user_id = actor_id
   where dc.id <> candidate_record.id
     and dc.status = 'open'::public.duplicate_status
     and (dc.person_a_id = secondary_person.id or dc.person_b_id = secondary_person.id)
     and exists (
       select 1
         from public.duplicate_candidates existing
        where existing.id <> dc.id
          and existing.status = 'open'::public.duplicate_status
          and least(existing.person_a_id, existing.person_b_id) = least(
            primary_person.id,
            case when dc.person_a_id = secondary_person.id then dc.person_b_id else dc.person_a_id end
          )
          and greatest(existing.person_a_id, existing.person_b_id) = greatest(
            primary_person.id,
            case when dc.person_a_id = secondary_person.id then dc.person_b_id else dc.person_a_id end
          )
     );

  update public.duplicate_candidates dc
     set person_a_id = case when dc.person_a_id = secondary_person.id then primary_person.id else dc.person_a_id end,
         person_b_id = case when dc.person_b_id = secondary_person.id then primary_person.id else dc.person_b_id end
   where dc.id <> candidate_record.id
     and dc.status = 'open'::public.duplicate_status
     and (dc.person_a_id = secondary_person.id or dc.person_b_id = secondary_person.id);

  insert into public.activities (
    person_id,
    activity_type,
    actor_staff_user_id,
    metadata
  ) values (
    primary_person.id,
    'duplicate_merged',
    actor_id,
    jsonb_build_object(
      'candidate_id', candidate_record.id,
      'merged_person_id', secondary_person.id
    )
  );

  perform private.append_admin_audit(
    'duplicate_merged',
    'person',
    primary_person.id,
    jsonb_build_object(
      'candidate_id', candidate_record.id,
      'merged_person_id', secondary_person.id
    )
  );
end;
$$;

revoke all on function public.resolve_duplicate_candidate(uuid, text, uuid) from public, anon;
grant execute on function public.resolve_duplicate_candidate(uuid, text, uuid) to authenticated;
