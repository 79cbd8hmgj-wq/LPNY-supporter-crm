begin;

select plan(40);

select has_type('public', 'staff_role', 'staff_role enum exists');
select has_table('public', 'staff_users', 'staff_users exists');
select has_table('public', 'counties', 'counties exists');
select has_table('public', 'staff_counties', 'staff_counties exists');
select is((select count(*) from public.counties)::bigint, 62::bigint, 'all 62 NY counties are seeded');
select has_table('public', 'people', 'people exists');
select has_table('public', 'person_relationships', 'person_relationships exists');
select has_table('public', 'person_interests', 'person_interests exists');
select has_table('public', 'person_sources', 'person_sources exists');
select has_table('public', 'activities', 'activities exists');
select has_table('public', 'internal_notes', 'internal_notes exists');
select has_table('public', 'tasks', 'tasks exists');
select has_table('public', 'consent_events', 'consent_events exists');
select has_table('public', 'staff_person_assignments', 'staff_person_assignments exists');
select has_table('public', 'duplicate_candidates', 'duplicate_candidates exists');
select ok(
  has_table_privilege('service_role', 'public.people', 'SELECT'),
  'service role can select CRM people for trusted server-side workflows'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.counties'::regclass),
  'counties has RLS enabled in exposed public schema'
);
select ok(
  has_table_privilege('anon', 'public.counties', 'SELECT'),
  'anonymous public intake can read county lookup values'
);
select ok(
  not has_table_privilege('anon', 'public.counties', 'INSERT'),
  'anonymous callers cannot insert counties'
);
select ok(
  not has_table_privilege('anon', 'public.counties', 'UPDATE'),
  'anonymous callers cannot update counties'
);
select ok(
  not has_table_privilege('anon', 'public.counties', 'DELETE'),
  'anonymous callers cannot delete counties'
);
select ok(
  has_table_privilege('authenticated', 'public.counties', 'SELECT'),
  'authenticated staff can read county lookup values'
);
select ok(
  not has_table_privilege('authenticated', 'public.counties', 'INSERT'),
  'authenticated callers cannot insert counties directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.counties', 'UPDATE'),
  'authenticated callers cannot update counties directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.counties', 'DELETE'),
  'authenticated callers cannot delete counties directly'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.admin_register_staff_user(uuid,text,public.staff_role,uuid[])',
    'EXECUTE'
  ),
  'anonymous callers cannot execute admin staff registration'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.admin_update_staff_access(uuid,public.staff_role,public.staff_status,uuid[])',
    'EXECUTE'
  ),
  'anonymous callers cannot execute admin staff access updates'
);
select ok(
  not has_function_privilege('anon', 'public.sync_person_last_activity()', 'EXECUTE'),
  'anonymous callers cannot execute trigger-only activity sync helper'
);
select ok(
  not has_function_privilege('authenticated', 'public.sync_person_last_activity()', 'EXECUTE'),
  'authenticated callers cannot execute trigger-only activity sync helper'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000101','authenticated','authenticated','admin@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000102','authenticated','authenticated','state@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000103','authenticated','authenticated','albany@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000104','authenticated','authenticated','erie@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000105','authenticated','authenticated','volunteer@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000106','authenticated','authenticated','disabled@test.local','',now(),'{}','{}',now(),now());

insert into public.staff_users (id, auth_user_id, display_name, role, status) values
('10000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000101','Admin','admin','active'),
('10000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000102','State','state_organizer','active'),
('10000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000103','Albany Organizer','county_organizer','active'),
('10000000-0000-0000-0000-000000000104','00000000-0000-0000-0000-000000000104','Erie Organizer','county_organizer','active'),
('10000000-0000-0000-0000-000000000105','00000000-0000-0000-0000-000000000105','Volunteer','volunteer_staff','active'),
('10000000-0000-0000-0000-000000000106','00000000-0000-0000-0000-000000000106','Disabled','state_organizer','disabled');

insert into public.staff_counties (staff_user_id, county_id)
select '10000000-0000-0000-0000-000000000103', id from public.counties where name = 'Albany';
insert into public.staff_counties (staff_user_id, county_id)
select '10000000-0000-0000-0000-000000000104', id from public.counties where name = 'Erie';

insert into public.people (id, first_name, last_name, normalized_email, county_id) values
('20000000-0000-0000-0000-000000000201','Alice','Albany','alice@test.local',(select id from public.counties where name = 'Albany')),
('20000000-0000-0000-0000-000000000202','Evan','Erie','evan@test.local',(select id from public.counties where name = 'Erie'));

insert into public.staff_person_assignments (staff_user_id, person_id) values
('10000000-0000-0000-0000-000000000105','20000000-0000-0000-0000-000000000201');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.people)::bigint, 2::bigint, 'Admin sees statewide people');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.people)::bigint, 2::bigint, 'State Organizer sees statewide people');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.people)::bigint, 1::bigint, 'Albany County Organizer sees one person');
select is((select min(first_name) from public.people), 'Alice'::text, 'Albany County Organizer sees Albany person');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000104","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.people)::bigint, 1::bigint, 'Erie County Organizer sees one person');
select is((select min(first_name) from public.people), 'Evan'::text, 'Erie County Organizer sees Erie person');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000105","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.people)::bigint, 1::bigint, 'Volunteer/Staff sees one explicitly assigned person');
select is((select min(first_name) from public.people), 'Alice'::text, 'Volunteer/Staff sees assigned person');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000106","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.people)::bigint, 0::bigint, 'Disabled staff account sees no people');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$insert into public.people (first_name, last_name, normalized_email, county_id)
    values ('Blocked', 'Erie', 'blocked-erie@test.local', (select id from public.counties where name = 'Erie'))$$,
  '42501',
  null,
  'Albany County Organizer cannot insert an Erie person'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000105","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$insert into public.people (first_name, last_name, normalized_email, county_id)
    values ('Blocked', 'Volunteer', 'blocked-volunteer@test.local', (select id from public.counties where name = 'Albany'))$$,
  '42501',
  null,
  'Volunteer/Staff cannot insert canonical people records'
);
reset role;

select * from finish();
rollback;
