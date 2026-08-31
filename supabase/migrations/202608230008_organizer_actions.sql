-- Narrow transactional entry points for organizer workflows.
-- These functions are SECURITY DEFINER so explicitly assigned volunteers can perform
-- carefully-scoped mutations (notably do-not-contact) without broadening the people
-- table UPDATE policy. Every function re-checks the caller's CRM identity and person
-- scope from the authenticated JWT before writing.

create or replace function private.require_active_person_access(target_person_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor_staff_user_id uuid;
begin
  v_actor_staff_user_id := private.current_staff_user_id();

  if v_actor_staff_user_id is null
     or not coalesce(private.can_access_person(target_person_id), false)
     or not exists (
       select 1
       from public.people p
       where p.id = target_person_id
         and p.archived_at is null
     ) then
    raise exception 'person is not available to the current staff user'
      using errcode = '42501';
  end if;

  return v_actor_staff_user_id;
end;
$$;

revoke all on function private.require_active_person_access(uuid) from public;
revoke all on function private.require_active_person_access(uuid) from anon;
revoke all on function private.require_active_person_access(uuid) from authenticated;

create or replace function public.create_follow_up_task(
  p_person_id uuid,
  p_due_at timestamptz,
  p_priority public.task_priority
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_staff_user_id uuid;
  v_assignee_staff_user_id uuid;
  v_task_id uuid;
begin
  v_actor_staff_user_id := private.require_active_person_access(p_person_id);

  if p_due_at is null then
    raise exception 'follow-up due date is required'
      using errcode = '22023';
  end if;

  select coalesce(p.assigned_staff_user_id, v_actor_staff_user_id)
    into v_assignee_staff_user_id
  from public.people p
  where p.id = p_person_id;

  insert into public.tasks (
    person_id,
    assignee_staff_user_id,
    task_type,
    due_at,
    priority,
    status,
    created_by_staff_user_id
  ) values (
    p_person_id,
    v_assignee_staff_user_id,
    'follow_up',
    p_due_at,
    coalesce(p_priority, 'normal'::public.task_priority),
    'open',
    v_actor_staff_user_id
  )
  returning id into v_task_id;

  insert into public.activities (
    person_id,
    activity_type,
    actor_staff_user_id,
    metadata
  ) values (
    p_person_id,
    'follow_up_created',
    v_actor_staff_user_id,
    jsonb_build_object(
      'task_id', v_task_id,
      'due_at', p_due_at,
      'priority', coalesce(p_priority, 'normal'::public.task_priority)::text
    )
  );

  return v_task_id;
end;
$$;

create or replace function public.record_contact_outcome(
  p_person_id uuid,
  p_outcome text,
  p_follow_up_due_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_staff_user_id uuid;
begin
  v_actor_staff_user_id := private.require_active_person_access(p_person_id);

  if p_outcome not in ('contacted', 'unable_to_reach') then
    raise exception 'unsupported contact outcome'
      using errcode = '22023';
  end if;

  if p_outcome = 'contacted' then
    update public.people
       set engagement_stage = case
         when engagement_stage in ('new', 'follow_up_needed')
           then 'contacted'::public.engagement_stage
         else engagement_stage
       end
     where id = p_person_id;
  end if;

  insert into public.activities (
    person_id,
    activity_type,
    actor_staff_user_id,
    metadata
  ) values (
    p_person_id,
    p_outcome,
    v_actor_staff_user_id,
    jsonb_build_object('outcome', p_outcome)
  );

  if p_follow_up_due_at is not null then
    perform public.create_follow_up_task(
      p_person_id,
      p_follow_up_due_at,
      'normal'::public.task_priority
    );
  end if;
end;
$$;

create or replace function public.change_person_stage(
  p_person_id uuid,
  p_stage public.engagement_stage
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_staff_user_id uuid;
  v_actor_role public.staff_role;
  v_previous_stage public.engagement_stage;
begin
  v_actor_staff_user_id := private.require_active_person_access(p_person_id);
  v_actor_role := private.current_staff_role();

  if v_actor_role not in ('admin', 'state_organizer', 'county_organizer') then
    raise exception 'current staff role cannot change engagement stage'
      using errcode = '42501';
  end if;

  select engagement_stage
    into v_previous_stage
  from public.people
  where id = p_person_id;

  if v_previous_stage = p_stage then
    return;
  end if;

  update public.people
     set engagement_stage = p_stage
   where id = p_person_id;

  insert into public.activities (
    person_id,
    activity_type,
    actor_staff_user_id,
    metadata
  ) values (
    p_person_id,
    'stage_changed',
    v_actor_staff_user_id,
    jsonb_build_object(
      'from', v_previous_stage::text,
      'to', p_stage::text
    )
  );
end;
$$;

create or replace function public.add_person_note(
  p_person_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_staff_user_id uuid;
  v_note_id uuid;
begin
  v_actor_staff_user_id := private.require_active_person_access(p_person_id);

  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'note body is required'
      using errcode = '22023';
  end if;

  insert into public.internal_notes (
    person_id,
    author_staff_user_id,
    body
  ) values (
    p_person_id,
    v_actor_staff_user_id,
    trim(p_body)
  )
  returning id into v_note_id;

  insert into public.activities (
    person_id,
    activity_type,
    actor_staff_user_id,
    metadata
  ) values (
    p_person_id,
    'note_added',
    v_actor_staff_user_id,
    jsonb_build_object('note_id', v_note_id)
  );

  return v_note_id;
end;
$$;

create or replace function public.set_person_relationship(
  p_person_id uuid,
  p_relationship_slug text,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_staff_user_id uuid;
  v_actor_role public.staff_role;
  v_relationship_type_id uuid;
  v_changed integer := 0;
begin
  v_actor_staff_user_id := private.require_active_person_access(p_person_id);
  v_actor_role := private.current_staff_role();

  if v_actor_role not in ('admin', 'state_organizer', 'county_organizer') then
    raise exception 'current staff role cannot change relationships'
      using errcode = '42501';
  end if;

  select id
    into v_relationship_type_id
  from public.relationship_types
  where slug = p_relationship_slug
    and active = true;

  if v_relationship_type_id is null then
    raise exception 'unknown relationship type'
      using errcode = '22023';
  end if;

  if p_enabled then
    insert into public.person_relationships (person_id, relationship_type_id)
    values (p_person_id, v_relationship_type_id)
    on conflict do nothing;
    get diagnostics v_changed = row_count;
  else
    delete from public.person_relationships
    where person_id = p_person_id
      and relationship_type_id = v_relationship_type_id;
    get diagnostics v_changed = row_count;
  end if;

  if v_changed > 0 then
    insert into public.activities (
      person_id,
      activity_type,
      actor_staff_user_id,
      metadata
    ) values (
      p_person_id,
      case when p_enabled then 'relationship_added' else 'relationship_removed' end,
      v_actor_staff_user_id,
      jsonb_build_object('relationship', p_relationship_slug)
    );
  end if;
end;
$$;

create or replace function public.set_person_interest(
  p_person_id uuid,
  p_interest_slug text,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_staff_user_id uuid;
  v_actor_role public.staff_role;
  v_interest_id uuid;
  v_changed integer := 0;
begin
  v_actor_staff_user_id := private.require_active_person_access(p_person_id);
  v_actor_role := private.current_staff_role();

  if v_actor_role not in ('admin', 'state_organizer', 'county_organizer') then
    raise exception 'current staff role cannot change interests'
      using errcode = '42501';
  end if;

  select id
    into v_interest_id
  from public.interests
  where slug = p_interest_slug
    and active = true;

  if v_interest_id is null then
    raise exception 'unknown interest'
      using errcode = '22023';
  end if;

  if p_enabled then
    insert into public.person_interests (person_id, interest_id)
    values (p_person_id, v_interest_id)
    on conflict do nothing;
    get diagnostics v_changed = row_count;
  else
    delete from public.person_interests
    where person_id = p_person_id
      and interest_id = v_interest_id;
    get diagnostics v_changed = row_count;
  end if;

  if v_changed > 0 then
    insert into public.activities (
      person_id,
      activity_type,
      actor_staff_user_id,
      metadata
    ) values (
      p_person_id,
      case when p_enabled then 'interest_added' else 'interest_removed' end,
      v_actor_staff_user_id,
      jsonb_build_object('interest', p_interest_slug)
    );
  end if;
end;
$$;

create or replace function public.set_person_tag(
  p_person_id uuid,
  p_tag_id uuid,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_staff_user_id uuid;
  v_actor_role public.staff_role;
  v_tag_name text;
  v_changed integer := 0;
begin
  v_actor_staff_user_id := private.require_active_person_access(p_person_id);
  v_actor_role := private.current_staff_role();

  if v_actor_role not in ('admin', 'state_organizer', 'county_organizer') then
    raise exception 'current staff role cannot change tags'
      using errcode = '42501';
  end if;

  select name
    into v_tag_name
  from public.tags
  where id = p_tag_id
    and active = true;

  if v_tag_name is null then
    raise exception 'unknown tag'
      using errcode = '22023';
  end if;

  if p_enabled then
    insert into public.person_tags (person_id, tag_id)
    values (p_person_id, p_tag_id)
    on conflict do nothing;
    get diagnostics v_changed = row_count;
  else
    delete from public.person_tags
    where person_id = p_person_id
      and tag_id = p_tag_id;
    get diagnostics v_changed = row_count;
  end if;

  if v_changed > 0 then
    insert into public.activities (
      person_id,
      activity_type,
      actor_staff_user_id,
      metadata
    ) values (
      p_person_id,
      case when p_enabled then 'tag_added' else 'tag_removed' end,
      v_actor_staff_user_id,
      jsonb_build_object('tag_id', p_tag_id, 'tag_name', v_tag_name)
    );
  end if;
end;
$$;

create or replace function public.reassign_person(
  p_person_id uuid,
  p_assigned_staff_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_staff_user_id uuid;
  v_actor_role public.staff_role;
  v_previous_staff_user_id uuid;
  v_person_county_id uuid;
  v_target_role public.staff_role;
begin
  v_actor_staff_user_id := private.require_active_person_access(p_person_id);
  v_actor_role := private.current_staff_role();

  if v_actor_role not in ('admin', 'state_organizer') then
    raise exception 'current staff role cannot reassign people'
      using errcode = '42501';
  end if;

  select p.assigned_staff_user_id, p.county_id
    into v_previous_staff_user_id, v_person_county_id
  from public.people p
  where p.id = p_person_id;

  select su.role
    into v_target_role
  from public.staff_users su
  where su.id = p_assigned_staff_user_id
    and su.status = 'active';

  if v_target_role is null
     or v_target_role not in ('admin', 'state_organizer', 'county_organizer') then
    raise exception 'target assignee is not an active organizer'
      using errcode = '22023';
  end if;

  if v_target_role = 'county_organizer'
     and (
       v_person_county_id is null
       or not exists (
         select 1
         from public.staff_counties sc
         where sc.staff_user_id = p_assigned_staff_user_id
           and sc.county_id = v_person_county_id
       )
     ) then
    raise exception 'target organizer is not assigned to this county'
      using errcode = '22023';
  end if;

  if v_previous_staff_user_id is not distinct from p_assigned_staff_user_id then
    return;
  end if;

  update public.people
     set assigned_staff_user_id = p_assigned_staff_user_id
   where id = p_person_id;

  insert into public.activities (
    person_id,
    activity_type,
    actor_staff_user_id,
    metadata
  ) values (
    p_person_id,
    'reassigned',
    v_actor_staff_user_id,
    jsonb_build_object(
      'from_staff_user_id', v_previous_staff_user_id,
      'to_staff_user_id', p_assigned_staff_user_id
    )
  );
end;
$$;

create or replace function public.set_person_do_not_contact(
  p_person_id uuid,
  p_do_not_contact boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_staff_user_id uuid;
  v_previous_value boolean;
begin
  v_actor_staff_user_id := private.require_active_person_access(p_person_id);

  select do_not_contact
    into v_previous_value
  from public.people
  where id = p_person_id;

  if v_previous_value is not distinct from p_do_not_contact then
    return;
  end if;

  update public.people
     set do_not_contact = p_do_not_contact
   where id = p_person_id;

  insert into public.activities (
    person_id,
    activity_type,
    actor_staff_user_id,
    metadata
  ) values (
    p_person_id,
    'do_not_contact_changed',
    v_actor_staff_user_id,
    jsonb_build_object('enabled', p_do_not_contact)
  );
end;
$$;

create or replace function public.complete_person_task(
  p_task_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_staff_user_id uuid;
  v_person_id uuid;
  v_task_type text;
begin
  select t.person_id, t.task_type
    into v_person_id, v_task_type
  from public.tasks t
  where t.id = p_task_id
    and t.status = 'open';

  if v_person_id is null then
    raise exception 'task is not available'
      using errcode = '42501';
  end if;

  v_actor_staff_user_id := private.require_active_person_access(v_person_id);

  update public.tasks
     set status = 'completed',
         completed_at = now()
   where id = p_task_id
     and status = 'open';

  insert into public.activities (
    person_id,
    activity_type,
    actor_staff_user_id,
    metadata
  ) values (
    v_person_id,
    'task_completed',
    v_actor_staff_user_id,
    jsonb_build_object('task_id', p_task_id, 'task_type', v_task_type)
  );
end;
$$;

create or replace function public.archive_person(
  p_person_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_staff_user_id uuid;
  v_actor_role public.staff_role;
begin
  v_actor_staff_user_id := private.require_active_person_access(p_person_id);
  v_actor_role := private.current_staff_role();

  if v_actor_role <> 'admin'::public.staff_role then
    raise exception 'only administrators can archive people'
      using errcode = '42501';
  end if;

  update public.people
     set archived_at = now()
   where id = p_person_id;

  insert into public.activities (
    person_id,
    activity_type,
    actor_staff_user_id,
    metadata
  ) values (
    p_person_id,
    'archived',
    v_actor_staff_user_id,
    '{}'::jsonb
  );
end;
$$;

revoke all on function public.create_follow_up_task(uuid, timestamptz, public.task_priority) from public;
revoke all on function public.record_contact_outcome(uuid, text, timestamptz) from public;
revoke all on function public.change_person_stage(uuid, public.engagement_stage) from public;
revoke all on function public.add_person_note(uuid, text) from public;
revoke all on function public.set_person_relationship(uuid, text, boolean) from public;
revoke all on function public.set_person_interest(uuid, text, boolean) from public;
revoke all on function public.set_person_tag(uuid, uuid, boolean) from public;
revoke all on function public.reassign_person(uuid, uuid) from public;
revoke all on function public.set_person_do_not_contact(uuid, boolean) from public;
revoke all on function public.complete_person_task(uuid) from public;
revoke all on function public.archive_person(uuid) from public;

revoke all on function public.create_follow_up_task(uuid, timestamptz, public.task_priority) from anon;
revoke all on function public.record_contact_outcome(uuid, text, timestamptz) from anon;
revoke all on function public.change_person_stage(uuid, public.engagement_stage) from anon;
revoke all on function public.add_person_note(uuid, text) from anon;
revoke all on function public.set_person_relationship(uuid, text, boolean) from anon;
revoke all on function public.set_person_interest(uuid, text, boolean) from anon;
revoke all on function public.set_person_tag(uuid, uuid, boolean) from anon;
revoke all on function public.reassign_person(uuid, uuid) from anon;
revoke all on function public.set_person_do_not_contact(uuid, boolean) from anon;
revoke all on function public.complete_person_task(uuid) from anon;
revoke all on function public.archive_person(uuid) from anon;

grant execute on function public.create_follow_up_task(uuid, timestamptz, public.task_priority) to authenticated;
grant execute on function public.record_contact_outcome(uuid, text, timestamptz) to authenticated;
grant execute on function public.change_person_stage(uuid, public.engagement_stage) to authenticated;
grant execute on function public.add_person_note(uuid, text) to authenticated;
grant execute on function public.set_person_relationship(uuid, text, boolean) to authenticated;
grant execute on function public.set_person_interest(uuid, text, boolean) to authenticated;
grant execute on function public.set_person_tag(uuid, uuid, boolean) to authenticated;
grant execute on function public.reassign_person(uuid, uuid) to authenticated;
grant execute on function public.set_person_do_not_contact(uuid, boolean) to authenticated;
grant execute on function public.complete_person_task(uuid) to authenticated;
grant execute on function public.archive_person(uuid) to authenticated;
