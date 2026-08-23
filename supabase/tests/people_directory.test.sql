begin;

select plan(10);

select has_function('public', 'search_people_directory', 'people directory search function exists');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000201','authenticated','authenticated','directory-admin@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000202','authenticated','authenticated','directory-albany@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000203','authenticated','authenticated','directory-volunteer@test.local','',now(),'{}','{}',now(),now());

insert into public.staff_users (id, auth_user_id, display_name, role, status) values
('10000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000201','Directory Admin','admin','active'),
('10000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000202','Directory Albany','county_organizer','active'),
('10000000-0000-0000-0000-000000000203','00000000-0000-0000-0000-000000000203','Directory Volunteer','volunteer_staff','active');

insert into public.staff_counties (staff_user_id, county_id)
select '10000000-0000-0000-0000-000000000202', id
from public.counties where name = 'Albany';

insert into public.people (
  id, first_name, last_name, email, normalized_email, phone, normalized_phone,
  zip_code, county_id, engagement_stage, assigned_staff_user_id,
  last_activity_at, created_at
) values
(
  '20000000-0000-0000-0000-000000000301','Avery','Active','avery@example.test','avery@example.test',
  '5185550101','5185550101','12207',(select id from public.counties where name = 'Albany'),'engaged',
  '10000000-0000-0000-0000-000000000202','2026-08-20T14:00:00Z','2026-01-15T14:00:00Z'
),
(
  '20000000-0000-0000-0000-000000000302','Casey','Candidate','casey@example.test','casey@example.test',
  '7165550102','7165550102','14201',(select id from public.counties where name = 'Erie'),'new',
  null,'2026-08-22T14:00:00Z','2026-07-01T14:00:00Z'
),
(
  '20000000-0000-0000-0000-000000000303','Frankie','Former','frankie@example.test','frankie@example.test',
  null,null,'12180',(select id from public.counties where name = 'Rensselaer'),'inactive',
  null,'2026-01-01T14:00:00Z','2025-01-01T14:00:00Z'
);

insert into public.staff_person_assignments (staff_user_id, person_id) values
('10000000-0000-0000-0000-000000000203','20000000-0000-0000-0000-000000000302');

insert into public.person_relationships (person_id, relationship_type_id)
select '20000000-0000-0000-0000-000000000301', id from public.relationship_types where slug = 'volunteer';
insert into public.person_relationships (person_id, relationship_type_id)
select '20000000-0000-0000-0000-000000000301', id from public.relationship_types where slug = 'member';
insert into public.person_relationships (person_id, relationship_type_id)
select '20000000-0000-0000-0000-000000000302', id from public.relationship_types where slug = 'candidate-interest';
insert into public.person_relationships (person_id, relationship_type_id)
select '20000000-0000-0000-0000-000000000303', id from public.relationship_types where slug = 'former-member';

insert into public.person_interests (person_id, interest_id)
select '20000000-0000-0000-0000-000000000301', id from public.interests where slug = 'local-activism';

insert into public.tags (id, name, created_by_staff_user_id)
values ('30000000-0000-0000-0000-000000000301','Good speaker','10000000-0000-0000-0000-000000000201');
insert into public.person_tags (person_id, tag_id)
values ('20000000-0000-0000-0000-000000000301','30000000-0000-0000-0000-000000000301');

insert into public.sources (id, slug, category, name)
values
('40000000-0000-0000-0000-000000000301','directory-website','website','Directory Website'),
('40000000-0000-0000-0000-000000000302','directory-event','event','Directory Event');
insert into public.person_sources (person_id, source_id) values
('20000000-0000-0000-0000-000000000301','40000000-0000-0000-0000-000000000301'),
('20000000-0000-0000-0000-000000000302','40000000-0000-0000-0000-000000000302');

insert into public.tasks (person_id, task_type, status, priority)
values ('20000000-0000-0000-0000-000000000301','initial_follow_up','open','high');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000201","role":"authenticated"}', true);
set local role authenticated;

select is(
  (select count(*) from public.search_people_directory())::bigint,
  3::bigint,
  'Admin can search all active contacts in scope'
);
select is(
  (select count(*) from public.search_people_directory(p_query => 'avery'))::bigint,
  1::bigint,
  'Free-text search matches supporter identity/contact fields'
);
select is(
  (select count(*) from public.search_people_directory(p_relationship_slug => 'volunteer'))::bigint,
  1::bigint,
  'Relationship filter works'
);
select is(
  (select count(*) from public.search_people_directory(p_has_open_task => true))::bigint,
  1::bigint,
  'Open-task filter works'
);
select is(
  (select count(*) from public.search_people_directory(p_candidate_interest => true))::bigint,
  1::bigint,
  'Candidate-interest filter works'
);
select is(
  (select count(*) from public.search_people_directory(p_member_status => 'member'))::bigint,
  1::bigint,
  'Member-status filter works'
);
select is(
  (select count(*) from public.search_people_directory(p_tag_id => '30000000-0000-0000-0000-000000000301'))::bigint,
  1::bigint,
  'Tag filter uses a stable tag id'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000202","role":"authenticated"}', true);
set local role authenticated;
select is(
  (select count(*) from public.search_people_directory())::bigint,
  1::bigint,
  'County organizer search remains limited by people RLS'
);
select is(
  (select count(*) from public.search_people_directory(p_query => 'Casey Candidate'))::bigint,
  0::bigint,
  'County organizer cannot widen search into another county'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000203","role":"authenticated"}', true);
set local role authenticated;
select is(
  (select count(*) from public.search_people_directory())::bigint,
  1::bigint,
  'Volunteer search remains limited to explicitly assigned people'
);
reset role;

select * from finish();
rollback;
