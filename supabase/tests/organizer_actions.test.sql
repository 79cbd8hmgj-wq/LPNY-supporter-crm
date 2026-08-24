begin;

select plan(35);

select has_function('public', 'record_contact_outcome', array['uuid', 'text', 'timestamp with time zone'], 'contact outcome function exists');
select has_function('public', 'create_follow_up_task', array['uuid', 'timestamp with time zone', 'task_priority'], 'follow-up task function exists');
select has_function('public', 'change_person_stage', array['uuid', 'engagement_stage'], 'stage change function exists');
select has_function('public', 'add_person_note', array['uuid', 'text'], 'note function exists');
select has_function('public', 'set_person_relationship', array['uuid', 'text', 'boolean'], 'relationship function exists');
select has_function('public', 'set_person_interest', array['uuid', 'text', 'boolean'], 'interest function exists');
select has_function('public', 'set_person_tag', array['uuid', 'uuid', 'boolean'], 'tag function exists');
select has_function('public', 'reassign_person', array['uuid', 'uuid'], 'reassignment function exists');
select has_function('public', 'set_person_do_not_contact', array['uuid', 'boolean'], 'do-not-contact function exists');
select has_function('public', 'complete_person_task', array['uuid'], 'task completion function exists');
select has_function('public', 'archive_person', array['uuid'], 'archive function exists');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000401','authenticated','authenticated','actions-admin@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000402','authenticated','authenticated','actions-county@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000403','authenticated','authenticated','actions-volunteer@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000404','authenticated','authenticated','actions-target@test.local','',now(),'{}','{}',now(),now());

insert into public.staff_users (id, auth_user_id, display_name, role, status) values
('10000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000401','Actions Admin','admin','active'),
('10000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000402','Actions Albany','county_organizer','active'),
('10000000-0000-0000-0000-000000000403','00000000-0000-0000-0000-000000000403','Actions Volunteer','volunteer_staff','active'),
('10000000-0000-0000-0000-000000000404','00000000-0000-0000-0000-000000000404','Actions Target','county_organizer','active');

insert into public.staff_counties (staff_user_id, county_id)
select '10000000-0000-0000-0000-000000000402', id from public.counties where name = 'Albany';
insert into public.staff_counties (staff_user_id, county_id)
select '10000000-0000-0000-0000-000000000404', id from public.counties where name = 'Albany';

insert into public.people (
  id, first_name, last_name, email, normalized_email, county_id, engagement_stage
) values
('20000000-0000-0000-0000-000000000401','Action','Albany','action-albany@test.local','action-albany@test.local',(select id from public.counties where name = 'Albany'),'new'),
('20000000-0000-0000-0000-000000000402','Action','Erie','action-erie@test.local','action-erie@test.local',(select id from public.counties where name = 'Erie'),'new');

insert into public.staff_person_assignments (staff_user_id, person_id)
values ('10000000-0000-0000-0000-000000000403','20000000-0000-0000-0000-000000000401');

insert into public.tags (id, name, created_by_staff_user_id)
values ('30000000-0000-0000-0000-000000000401','Actions Tag','10000000-0000-0000-0000-000000000401');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000402","role":"authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$select public.record_contact_outcome('20000000-0000-0000-0000-000000000401','contacted',null)$$,
  'County organizer can record contact in their county'
);
select is(
  (select engagement_stage::text from public.people where id = '20000000-0000-0000-0000-000000000401'),
  'contacted'::text,
  'Contacted outcome advances engagement stage'
);
select is(
  (select count(*) from public.activities where person_id = '20000000-0000-0000-0000-000000000401' and activity_type = 'contacted')::bigint,
  1::bigint,
  'Contacted outcome appends activity history'
);
select throws_ok(
  $$select public.record_contact_outcome('20000000-0000-0000-0000-000000000402','contacted',null)$$,
  '42501',
  null,
  'County organizer cannot mutate a person outside their county'
);

select lives_ok(
  $$select public.create_follow_up_task('20000000-0000-0000-0000-000000000401','2026-08-25T14:00:00Z','high')$$,
  'County organizer can create a follow-up task'
);
select is(
  (select count(*) from public.tasks where person_id = '20000000-0000-0000-0000-000000000401' and task_type = 'follow_up' and status = 'open')::bigint,
  1::bigint,
  'Follow-up task is created open'
);

select lives_ok(
  $$select public.add_person_note('20000000-0000-0000-0000-000000000401','Asked about volunteering next month.')$$,
  'County organizer can add an internal note'
);
select is(
  (select count(*) from public.internal_notes where person_id = '20000000-0000-0000-0000-000000000401')::bigint,
  1::bigint,
  'Internal note is persisted'
);

select lives_ok(
  $$select public.set_person_relationship('20000000-0000-0000-0000-000000000401','volunteer',true)$$,
  'County organizer can add a relationship'
);
select lives_ok(
  $$select public.set_person_interest('20000000-0000-0000-0000-000000000401','local-activism',true)$$,
  'County organizer can add an interest'
);
select lives_ok(
  $$select public.set_person_tag('20000000-0000-0000-0000-000000000401','30000000-0000-0000-0000-000000000401',true)$$,
  'County organizer can add an existing tag'
);

select throws_ok(
  $$select public.archive_person('20000000-0000-0000-0000-000000000401')$$,
  '42501',
  null,
  'County organizer cannot archive a person'
);
select throws_ok(
  $$select public.reassign_person('20000000-0000-0000-0000-000000000401','10000000-0000-0000-0000-000000000404')$$,
  '42501',
  null,
  'County organizer cannot reassign ownership'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000403","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.record_contact_outcome('20000000-0000-0000-0000-000000000401','unable_to_reach','2026-08-26T14:00:00Z')$$,
  'Assigned volunteer can record unable-to-reach and schedule follow-up'
);
select is(
  (select count(*) from public.tasks where person_id = '20000000-0000-0000-0000-000000000401' and task_type = 'follow_up' and status = 'open')::bigint,
  2::bigint,
  'Unable-to-reach with due date creates another follow-up task'
);
select throws_ok(
  $$select public.change_person_stage('20000000-0000-0000-0000-000000000401','engaged')$$,
  '42501',
  null,
  'Volunteer cannot directly change engagement stage'
);
select lives_ok(
  $$select public.set_person_do_not_contact('20000000-0000-0000-0000-000000000401',true)$$,
  'Assigned volunteer can record a do-not-contact request'
);
select is(
  (select do_not_contact from public.people where id = '20000000-0000-0000-0000-000000000401'),
  true,
  'Do-not-contact is persisted'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000401","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.reassign_person('20000000-0000-0000-0000-000000000401','10000000-0000-0000-0000-000000000404')$$,
  'Admin can reassign a person'
);
select is(
  (select assigned_staff_user_id from public.people where id = '20000000-0000-0000-0000-000000000401'),
  '10000000-0000-0000-0000-000000000404'::uuid,
  'Reassignment updates the canonical person'
);

select lives_ok(
  $$select public.complete_person_task((select id from public.tasks where person_id = '20000000-0000-0000-0000-000000000401' and status = 'open' order by created_at limit 1))$$,
  'Admin can complete a visible task'
);
select is(
  (select count(*) from public.tasks where person_id = '20000000-0000-0000-0000-000000000401' and status = 'completed')::bigint,
  1::bigint,
  'Task completion is persisted'
);

select lives_ok(
  $$select public.archive_person('20000000-0000-0000-0000-000000000401')$$,
  'Admin can archive a person'
);
select isnt(
  (select archived_at from public.people where id = '20000000-0000-0000-0000-000000000401'),
  null::timestamptz,
  'Archive stamps archived_at instead of deleting the person'
);
reset role;

select * from finish();
rollback;
