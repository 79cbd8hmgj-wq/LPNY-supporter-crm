create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_staff_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select su.id
  from public.staff_users su
  where su.auth_user_id = auth.uid()
    and su.status = 'active'
  limit 1
$$;

create or replace function private.current_staff_role()
returns public.staff_role
language sql
stable
security definer
set search_path = ''
as $$
  select su.role
  from public.staff_users su
  where su.auth_user_id = auth.uid()
    and su.status = 'active'
  limit 1
$$;

create or replace function private.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_staff_user_id() is not null
$$;

create or replace function private.can_access_county(target_county_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.current_staff_role() in ('admin', 'state_organizer') then true
    when private.current_staff_role() = 'county_organizer' then exists (
      select 1
      from public.staff_counties sc
      where sc.staff_user_id = private.current_staff_user_id()
        and sc.county_id = target_county_id
    )
    else false
  end
$$;

create or replace function private.can_access_person(target_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.current_staff_role() in ('admin', 'state_organizer') then true
    when private.current_staff_role() = 'county_organizer' then exists (
      select 1
      from public.people p
      where p.id = target_person_id
        and p.county_id is not null
        and private.can_access_county(p.county_id)
    )
    when private.current_staff_role() = 'volunteer_staff' then exists (
      select 1
      from public.staff_person_assignments spa
      where spa.staff_user_id = private.current_staff_user_id()
        and spa.person_id = target_person_id
    )
    else false
  end
$$;

revoke all on all functions in schema private from public;
grant execute on function private.current_staff_user_id() to authenticated;
grant execute on function private.current_staff_role() to authenticated;
grant execute on function private.is_active_staff() to authenticated;
grant execute on function private.can_access_county(uuid) to authenticated;
grant execute on function private.can_access_person(uuid) to authenticated;

alter table public.people enable row level security;
alter table public.person_relationships enable row level security;
alter table public.person_interests enable row level security;
alter table public.person_tags enable row level security;
alter table public.person_sources enable row level security;
alter table public.activities enable row level security;
alter table public.internal_notes enable row level security;
alter table public.tasks enable row level security;
alter table public.consent_events enable row level security;
alter table public.staff_person_assignments enable row level security;
alter table public.duplicate_candidates enable row level security;
alter table public.staff_users enable row level security;
alter table public.staff_counties enable row level security;
alter table public.tags enable row level security;
alter table public.sources enable row level security;
alter table public.relationship_types enable row level security;
alter table public.interests enable row level security;

create policy people_select
on public.people for select to authenticated
using (private.can_access_person(id));

create policy people_insert
on public.people for insert to authenticated
with check (
  private.current_staff_role() in ('admin', 'state_organizer')
  or (
    private.current_staff_role() = 'county_organizer'
    and county_id is not null
    and private.can_access_county(county_id)
  )
);

create policy people_update
on public.people for update to authenticated
using (private.can_access_person(id))
with check (
  private.current_staff_role() in ('admin', 'state_organizer')
  or (
    private.current_staff_role() = 'county_organizer'
    and county_id is not null
    and private.can_access_county(county_id)
  )
);

create policy person_relationships_select on public.person_relationships
for select to authenticated using (private.can_access_person(person_id));
create policy person_relationships_insert on public.person_relationships
for insert to authenticated with check (
  private.current_staff_role() in ('admin', 'state_organizer', 'county_organizer')
  and private.can_access_person(person_id)
);
create policy person_relationships_delete on public.person_relationships
for delete to authenticated using (
  private.current_staff_role() in ('admin', 'state_organizer', 'county_organizer')
  and private.can_access_person(person_id)
);

create policy person_interests_select on public.person_interests
for select to authenticated using (private.can_access_person(person_id));
create policy person_interests_insert on public.person_interests
for insert to authenticated with check (
  private.current_staff_role() in ('admin', 'state_organizer', 'county_organizer')
  and private.can_access_person(person_id)
);
create policy person_interests_delete on public.person_interests
for delete to authenticated using (
  private.current_staff_role() in ('admin', 'state_organizer', 'county_organizer')
  and private.can_access_person(person_id)
);

create policy person_tags_select on public.person_tags
for select to authenticated using (private.can_access_person(person_id));
create policy person_tags_insert on public.person_tags
for insert to authenticated with check (
  private.current_staff_role() in ('admin', 'state_organizer', 'county_organizer')
  and private.can_access_person(person_id)
);
create policy person_tags_delete on public.person_tags
for delete to authenticated using (
  private.current_staff_role() in ('admin', 'state_organizer', 'county_organizer')
  and private.can_access_person(person_id)
);

create policy person_sources_select on public.person_sources
for select to authenticated using (private.can_access_person(person_id));
create policy person_sources_insert on public.person_sources
for insert to authenticated with check (
  private.current_staff_role() in ('admin', 'state_organizer', 'county_organizer')
  and private.can_access_person(person_id)
);

create policy activities_select on public.activities
for select to authenticated using (private.can_access_person(person_id));
create policy activities_insert on public.activities
for insert to authenticated with check (private.can_access_person(person_id));

create policy consent_events_select on public.consent_events
for select to authenticated using (private.can_access_person(person_id));
create policy consent_events_insert on public.consent_events
for insert to authenticated with check (private.can_access_person(person_id));

create policy tasks_select on public.tasks
for select to authenticated using (private.can_access_person(person_id));
create policy tasks_insert on public.tasks
for insert to authenticated with check (private.can_access_person(person_id));
create policy tasks_update on public.tasks
for update to authenticated
using (private.can_access_person(person_id))
with check (private.can_access_person(person_id));
create policy tasks_delete on public.tasks
for delete to authenticated using (
  private.current_staff_role() in ('admin', 'state_organizer', 'county_organizer')
  and private.can_access_person(person_id)
);

create policy internal_notes_select on public.internal_notes
for select to authenticated using (private.can_access_person(person_id));
create policy internal_notes_insert on public.internal_notes
for insert to authenticated with check (
  private.can_access_person(person_id)
  and author_staff_user_id = private.current_staff_user_id()
);
create policy internal_notes_update on public.internal_notes
for update to authenticated
using (
  private.can_access_person(person_id)
  and (
    author_staff_user_id = private.current_staff_user_id()
    or private.current_staff_role() in ('admin', 'state_organizer')
  )
)
with check (private.can_access_person(person_id));
create policy internal_notes_delete on public.internal_notes
for delete to authenticated using (
  private.can_access_person(person_id)
  and (
    author_staff_user_id = private.current_staff_user_id()
    or private.current_staff_role() in ('admin', 'state_organizer')
  )
);

create policy relationship_types_read on public.relationship_types
for select to authenticated using (private.is_active_staff() and active);
create policy interests_read on public.interests
for select to authenticated using (private.is_active_staff() and active);
create policy sources_read on public.sources
for select to authenticated using (private.is_active_staff() and active);
create policy tags_read on public.tags
for select to authenticated using (private.is_active_staff() and active);
create policy tags_insert on public.tags
for insert to authenticated with check (private.current_staff_role() in ('admin', 'state_organizer'));
create policy tags_update on public.tags
for update to authenticated
using (private.current_staff_role() in ('admin', 'state_organizer'))
with check (private.current_staff_role() in ('admin', 'state_organizer'));

create policy staff_users_self_read on public.staff_users
for select to authenticated using (id = private.current_staff_user_id());
create policy staff_users_admin_read on public.staff_users
for select to authenticated using (private.current_staff_role() = 'admin');
create policy staff_users_state_read on public.staff_users
for select to authenticated using (
  private.current_staff_role() = 'state_organizer'
  and status = 'active'
);
create policy staff_users_admin_update on public.staff_users
for update to authenticated
using (private.current_staff_role() = 'admin')
with check (private.current_staff_role() = 'admin');

create policy staff_counties_read on public.staff_counties
for select to authenticated using (
  staff_user_id = private.current_staff_user_id()
  or private.current_staff_role() in ('admin', 'state_organizer')
);
create policy staff_counties_admin_insert on public.staff_counties
for insert to authenticated with check (private.current_staff_role() = 'admin');
create policy staff_counties_admin_delete on public.staff_counties
for delete to authenticated using (private.current_staff_role() = 'admin');

create policy staff_person_assignments_self_read on public.staff_person_assignments
for select to authenticated using (
  staff_user_id = private.current_staff_user_id()
  or private.current_staff_role() in ('admin', 'state_organizer')
);
create policy staff_person_assignments_manage on public.staff_person_assignments
for all to authenticated
using (private.current_staff_role() in ('admin', 'state_organizer'))
with check (private.current_staff_role() in ('admin', 'state_organizer'));

create policy duplicate_candidates_read on public.duplicate_candidates
for select to authenticated using (private.current_staff_role() in ('admin', 'state_organizer'));
create policy duplicate_candidates_insert on public.duplicate_candidates
for insert to authenticated with check (private.current_staff_role() in ('admin', 'state_organizer'));
create policy duplicate_candidates_update on public.duplicate_candidates
for update to authenticated
using (private.current_staff_role() in ('admin', 'state_organizer'))
with check (private.current_staff_role() in ('admin', 'state_organizer'));
