begin;

select plan(17);

select has_function(
  'public',
  'find_quick_add_candidates',
  array['text', 'text', 'text', 'text', 'text'],
  'Quick Add candidate search function exists'
);
select has_function(
  'public',
  'create_quick_add_person',
  array['text', 'text', 'text', 'text', 'text', 'text', 'text', 'text', 'text'],
  'Quick Add creation function exists'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000501','authenticated','authenticated','quick-admin@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000502','authenticated','authenticated','quick-albany@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000503','authenticated','authenticated','quick-volunteer@test.local','',now(),'{}','{}',now(),now());

insert into public.staff_users (id, auth_user_id, display_name, role, status) values
('10000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000501','Quick Admin','admin','active'),
('10000000-0000-0000-0000-000000000502','00000000-0000-0000-0000-000000000502','Quick Albany','county_organizer','active'),
('10000000-0000-0000-0000-000000000503','00000000-0000-0000-0000-000000000503','Quick Volunteer','volunteer_staff','active');

insert into public.staff_counties (staff_user_id, county_id)
select '10000000-0000-0000-0000-000000000502', id from public.counties where name = 'Albany';

insert into public.people (
  id, first_name, last_name, email, normalized_email, phone, normalized_phone, zip_code, county_id
) values
(
  '20000000-0000-0000-0000-000000000501',
  'Existing', 'Albany', 'existing-albany@test.local', 'existing-albany@test.local',
  '5185550101', '5185550101', '12207',
  (select id from public.counties where name = 'Albany')
),
(
  '20000000-0000-0000-0000-000000000502',
  'Existing', 'Erie', 'existing-erie@test.local', 'existing-erie@test.local',
  '7165550101', '7165550101', '14202',
  (select id from public.counties where name = 'Erie')
);

insert into public.staff_person_assignments (staff_user_id, person_id)
values ('10000000-0000-0000-0000-000000000503','20000000-0000-0000-0000-000000000501');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000502","role":"authenticated"}', true);
set local role authenticated;

select is(
  (
    select count(*)
    from public.find_quick_add_candidates(
      'Existing', 'Albany', 'existing-albany@test.local', null, '12207'
    )
  )::bigint,
  1::bigint,
  'County organizer sees a likely duplicate inside their assigned county'
);
select is(
  (
    select count(*)
    from public.find_quick_add_candidates(
      'Existing', 'Erie', null, '7165550101', '14202'
    )
  )::bigint,
  0::bigint,
  'County organizer cannot discover a likely duplicate outside their RLS scope'
);

select lives_ok(
  $$select public.create_quick_add_person(
    'New', 'Albany', 'new-albany@test.local', 'new-albany@test.local',
    null, null, '12207', 'Albany', 'Albany'
  )$$,
  'County organizer can Quick Add a person in an assigned county'
);
select is(
  (select count(*) from public.people where normalized_email = 'new-albany@test.local')::bigint,
  1::bigint,
  'Quick Add creates one canonical person'
);
select is(
  (
    select count(*)
    from public.person_sources ps
    join public.sources s on s.id = ps.source_id
    join public.people p on p.id = ps.person_id
    where p.normalized_email = 'new-albany@test.local'
      and s.slug = 'organizer-entry'
  )::bigint,
  1::bigint,
  'Quick Add records the Organizer Entry source'
);
select is(
  (
    select count(*)
    from public.activities a
    join public.people p on p.id = a.person_id
    where p.normalized_email = 'new-albany@test.local'
      and a.activity_type = 'organizer_entry'
      and a.actor_staff_user_id = '10000000-0000-0000-0000-000000000502'
  )::bigint,
  1::bigint,
  'Quick Add appends organizer-attributed activity history'
);
select is(
  (
    select count(*)
    from public.tasks t
    join public.people p on p.id = t.person_id
    where p.normalized_email = 'new-albany@test.local'
      and t.task_type = 'initial_follow_up'
      and t.status = 'open'
      and t.queue_scope = 'county'
      and t.queue_county_id = (select id from public.counties where name = 'Albany')
  )::bigint,
  1::bigint,
  'Quick Add creates a county-routed initial follow-up task'
);
select is(
  (
    select count(*)
    from public.person_relationships pr
    join public.people p on p.id = pr.person_id
    join public.relationship_types rt on rt.id = pr.relationship_type_id
    where p.normalized_email = 'new-albany@test.local'
      and rt.slug = 'supporter'
  )::bigint,
  1::bigint,
  'Quick Add assigns the Supporter relationship'
);
select throws_ok(
  $$select public.create_quick_add_person(
    'New', 'Erie', 'new-erie@test.local', 'new-erie@test.local',
    null, null, '14202', 'Erie', 'Buffalo'
  )$$,
  '42501',
  null,
  'County organizer cannot Quick Add outside an assigned county'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000503","role":"authenticated"}', true);
set local role authenticated;
select is(
  (
    select count(*)
    from public.find_quick_add_candidates(
      'Existing', 'Albany', 'existing-albany@test.local', null, '12207'
    )
  )::bigint,
  1::bigint,
  'Assigned Volunteer/Staff can only search duplicates among contacts already visible to them'
);
select throws_ok(
  $$select public.create_quick_add_person(
    'Volunteer', 'Entry', 'volunteer-entry@test.local', 'volunteer-entry@test.local',
    null, null, '12207', 'Albany', 'Albany'
  )$$,
  '42501',
  null,
  'Volunteer/Staff cannot create Quick Add contacts'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000501","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.create_quick_add_person(
    'Outside', 'New York', 'outside-ny@test.local', 'outside-ny@test.local',
    null, null, '01201', null, 'Pittsfield'
  )$$,
  'Admin can Quick Add an unresolved or out-of-state contact'
);
select is(
  (select county_id from public.people where normalized_email = 'outside-ny@test.local'),
  null::uuid,
  'Out-of-state Quick Add retains an unresolved county'
);
select is(
  (
    select count(*)
    from public.tasks t
    join public.people p on p.id = t.person_id
    where p.normalized_email = 'outside-ny@test.local'
      and t.task_type = 'initial_follow_up'
      and t.status = 'open'
      and t.queue_scope = 'statewide'
      and t.queue_county_id is null
  )::bigint,
  1::bigint,
  'Unresolved Quick Add routes initial follow-up statewide'
);
select throws_ok(
  $$select public.create_quick_add_person(
    'Duplicate', 'Email', 'existing-albany@test.local', 'existing-albany@test.local',
    null, null, '12207', 'Albany', 'Albany'
  )$$,
  '23505',
  null,
  'Quick Add refuses an exact active email duplicate at creation time'
);
reset role;

select * from finish();
rollback;
