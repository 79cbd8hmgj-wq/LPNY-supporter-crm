begin;

select plan(45);

select has_column(
  'public',
  'people',
  'merged_into_person_id',
  'people records expose merged-into linkage'
);

select ok(
  to_regprocedure('public.resolve_duplicate_candidate(uuid,text,uuid)') is not null,
  'duplicate resolution RPC exists'
);

select ok(
  not has_table_privilege('authenticated', 'public.duplicate_candidates', 'INSERT'),
  'authenticated cannot create duplicate candidates directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.duplicate_candidates', 'UPDATE'),
  'authenticated cannot bypass audited duplicate resolution updates'
);

select ok(
  not has_table_privilege('authenticated', 'public.duplicate_candidates', 'DELETE'),
  'authenticated cannot delete duplicate-candidate history'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000000','00000000-0000-4000-8000-000000000901','authenticated','authenticated','duplicate-admin@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-4000-8000-000000000902','authenticated','authenticated','duplicate-state@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-4000-8000-000000000903','authenticated','authenticated','duplicate-county@test.local','',now(),'{}','{}',now(),now());

insert into public.staff_users (id, auth_user_id, display_name, role, status) values
('10000000-0000-4000-8000-000000000901','00000000-0000-4000-8000-000000000901','Duplicate Admin','admin','active'),
('10000000-0000-4000-8000-000000000902','00000000-0000-4000-8000-000000000902','Duplicate State','state_organizer','active'),
('10000000-0000-4000-8000-000000000903','00000000-0000-4000-8000-000000000903','Duplicate County','county_organizer','active');

insert into public.staff_counties (staff_user_id, county_id)
select '10000000-0000-4000-8000-000000000903', id
from public.counties where name = 'Albany';

insert into public.people (
  id, first_name, last_name, email, normalized_email, phone, normalized_phone,
  zip_code, county_id, municipality, assigned_staff_user_id, do_not_contact
) values
(
  '20000000-0000-4000-8000-000000000901', 'Canonical', 'Person', null, null,
  '518-555-0101', '5185550101', null, null, null, null, false
),
(
  '20000000-0000-4000-8000-000000000902', 'Secondary', 'Person',
  'merge-secondary@test.local', 'merge-secondary@test.local',
  '518-555-0102', '5185550102', '12207',
  (select id from public.counties where name = 'Albany'), 'Albany',
  '10000000-0000-4000-8000-000000000902', true
),
(
  '20000000-0000-4000-8000-000000000903', 'Third', 'Candidate', null, null,
  null, null, null, null, null, null, false
),
(
  '20000000-0000-4000-8000-000000000904', 'Keep', 'One', null, null,
  null, null, null, null, null, null, false
),
(
  '20000000-0000-4000-8000-000000000905', 'Keep', 'Two', null, null,
  null, null, null, null, null, null, false
);

insert into public.relationship_types (id, slug, name, active) values
('91000000-0000-4000-8000-000000000901', 'merge-rel-shared', 'Merge Relationship Shared', true),
('91000000-0000-4000-8000-000000000902', 'merge-rel-secondary', 'Merge Relationship Secondary', true);

insert into public.interests (id, slug, name, active) values
('92000000-0000-4000-8000-000000000901', 'merge-interest-shared', 'Merge Interest Shared', true),
('92000000-0000-4000-8000-000000000902', 'merge-interest-secondary', 'Merge Interest Secondary', true);

insert into public.tags (id, name, active, created_by_staff_user_id) values
('93000000-0000-4000-8000-000000000901', 'Merge Tag Shared', true, '10000000-0000-4000-8000-000000000901'),
('93000000-0000-4000-8000-000000000902', 'Merge Tag Secondary', true, '10000000-0000-4000-8000-000000000901');

insert into public.sources (id, slug, category, name, active) values
('94000000-0000-4000-8000-000000000901', 'merge-fixture-source', 'test', 'Merge Fixture Source', true);

insert into public.person_relationships (person_id, relationship_type_id) values
('20000000-0000-4000-8000-000000000901','91000000-0000-4000-8000-000000000901'),
('20000000-0000-4000-8000-000000000902','91000000-0000-4000-8000-000000000901'),
('20000000-0000-4000-8000-000000000902','91000000-0000-4000-8000-000000000902');

insert into public.person_interests (person_id, interest_id) values
('20000000-0000-4000-8000-000000000901','92000000-0000-4000-8000-000000000901'),
('20000000-0000-4000-8000-000000000902','92000000-0000-4000-8000-000000000901'),
('20000000-0000-4000-8000-000000000902','92000000-0000-4000-8000-000000000902');

insert into public.person_tags (person_id, tag_id) values
('20000000-0000-4000-8000-000000000901','93000000-0000-4000-8000-000000000901'),
('20000000-0000-4000-8000-000000000902','93000000-0000-4000-8000-000000000901'),
('20000000-0000-4000-8000-000000000902','93000000-0000-4000-8000-000000000902');

insert into public.staff_person_assignments (staff_user_id, person_id) values
('10000000-0000-4000-8000-000000000901','20000000-0000-4000-8000-000000000901'),
('10000000-0000-4000-8000-000000000901','20000000-0000-4000-8000-000000000902'),
('10000000-0000-4000-8000-000000000902','20000000-0000-4000-8000-000000000902');

insert into public.person_sources (id, person_id, source_id, metadata) values
('95000000-0000-4000-8000-000000000901','20000000-0000-4000-8000-000000000902','94000000-0000-4000-8000-000000000901','{"fixture":true}'::jsonb);

insert into public.activities (id, person_id, activity_type, actor_staff_user_id, occurred_at, metadata) values
('96000000-0000-4000-8000-000000000901','20000000-0000-4000-8000-000000000902','fixture_secondary_activity','10000000-0000-4000-8000-000000000902',now() - interval '1 day','{"fixture":true}'::jsonb);

insert into public.internal_notes (id, person_id, author_staff_user_id, body) values
('97000000-0000-4000-8000-000000000901','20000000-0000-4000-8000-000000000902','10000000-0000-4000-8000-000000000901','Synthetic duplicate merge note');

insert into public.tasks (id, person_id, task_type, created_by_staff_user_id) values
('98000000-0000-4000-8000-000000000901','20000000-0000-4000-8000-000000000902','synthetic_merge_followup','10000000-0000-4000-8000-000000000901');

insert into public.consent_events (id, person_id, channel, state, source_id, actor_staff_user_id, metadata) values
('99000000-0000-4000-8000-000000000901','20000000-0000-4000-8000-000000000902','email','opted_in','94000000-0000-4000-8000-000000000901','10000000-0000-4000-8000-000000000902','{"fixture":true}'::jsonb);

insert into public.duplicate_candidates (id, person_a_id, person_b_id, reason, confidence) values
('50000000-0000-4000-8000-000000000901','20000000-0000-4000-8000-000000000901','20000000-0000-4000-8000-000000000902','merge target',0.9900),
('50000000-0000-4000-8000-000000000902','20000000-0000-4000-8000-000000000902','20000000-0000-4000-8000-000000000903','secondary versus third',0.8000),
('50000000-0000-4000-8000-000000000903','20000000-0000-4000-8000-000000000901','20000000-0000-4000-8000-000000000903','canonical versus third',0.8500),
('50000000-0000-4000-8000-000000000904','20000000-0000-4000-8000-000000000904','20000000-0000-4000-8000-000000000905','keep separate target',0.6000);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000903","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.resolve_duplicate_candidate(
    '50000000-0000-4000-8000-000000000904',
    'keep_separate',
    null
  )$$,
  '42501',
  null,
  'County Organizer cannot resolve duplicate candidates'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000902","role":"authenticated"}', true);
set local role authenticated;
select lives_ok(
  $$select public.resolve_duplicate_candidate(
    '50000000-0000-4000-8000-000000000904',
    'keep_separate',
    null
  )$$,
  'State Organizer can mark a duplicate candidate as keep separate'
);
reset role;

select is(
  (select status::text from public.duplicate_candidates where id = '50000000-0000-4000-8000-000000000904'),
  'kept_separate'::text,
  'keep-separate marks the candidate reviewed without merging people'
);
select is(
  (select reviewed_by_staff_user_id from public.duplicate_candidates where id = '50000000-0000-4000-8000-000000000904'),
  '10000000-0000-4000-8000-000000000902'::uuid,
  'keep-separate records the reviewing State Organizer'
);
select is(
  (select count(*) from public.admin_audit_events where action_type = 'duplicate_kept_separate' and target_id = '50000000-0000-4000-8000-000000000904')::bigint,
  1::bigint,
  'keep-separate appends an audit event'
);
select is(
  (select count(*) from public.people where id in ('20000000-0000-4000-8000-000000000904','20000000-0000-4000-8000-000000000905') and archived_at is null)::bigint,
  2::bigint,
  'keep-separate leaves both people active and independent'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000901","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.resolve_duplicate_candidate(
    '50000000-0000-4000-8000-000000000901',
    'merge',
    '20000000-0000-4000-8000-000000000903'
  )$$,
  '22023',
  null,
  'merge rejects a canonical person that is not one side of the candidate'
);
select lives_ok(
  $$select public.resolve_duplicate_candidate(
    '50000000-0000-4000-8000-000000000901',
    'merge',
    '20000000-0000-4000-8000-000000000901'
  )$$,
  'Admin can merge a duplicate candidate transactionally'
);
reset role;

select is(
  (select count(*) from public.people where id = '20000000-0000-4000-8000-000000000902')::bigint,
  1::bigint,
  'merge preserves the secondary person row instead of deleting it'
);
select ok(
  (select archived_at is not null from public.people where id = '20000000-0000-4000-8000-000000000902'),
  'merged secondary person is archived'
);
select is(
  (select merged_into_person_id from public.people where id = '20000000-0000-4000-8000-000000000902'),
  '20000000-0000-4000-8000-000000000901'::uuid,
  'merged secondary person links to the canonical person'
);
select is(
  (select email from public.people where id = '20000000-0000-4000-8000-000000000901'),
  'merge-secondary@test.local'::text,
  'missing canonical email is filled from the merged person'
);
select is(
  (select normalized_email from public.people where id = '20000000-0000-4000-8000-000000000901'),
  'merge-secondary@test.local'::text,
  'normalized email transfers after the secondary is archived'
);
select is(
  (select phone from public.people where id = '20000000-0000-4000-8000-000000000901'),
  '518-555-0101'::text,
  'existing canonical phone is preserved'
);
select is(
  (select normalized_phone from public.people where id = '20000000-0000-4000-8000-000000000901'),
  '5185550101'::text,
  'existing canonical normalized phone is preserved'
);
select is(
  (
    select concat_ws('|', p.zip_code, c.name, p.municipality)
    from public.people p
    left join public.counties c on c.id = p.county_id
    where p.id = '20000000-0000-4000-8000-000000000901'
  ),
  '12207|Albany|Albany'::text,
  'missing canonical geography is filled from the merged person'
);
select is(
  (select assigned_staff_user_id from public.people where id = '20000000-0000-4000-8000-000000000901'),
  '10000000-0000-4000-8000-000000000902'::uuid,
  'missing canonical organizer assignment is preserved from the merged person'
);
select ok(
  (select do_not_contact from public.people where id = '20000000-0000-4000-8000-000000000901'),
  'do-not-contact is preserved when either merged record has it enabled'
);
select is(
  (select count(*) from public.person_sources where id = '95000000-0000-4000-8000-000000000901' and person_id = '20000000-0000-4000-8000-000000000901')::bigint,
  1::bigint,
  'person source history is re-parented with its original row id'
);
select is(
  (select count(*) from public.activities where id = '96000000-0000-4000-8000-000000000901' and person_id = '20000000-0000-4000-8000-000000000901')::bigint,
  1::bigint,
  'existing activity history is re-parented'
);
select is(
  (select count(*) from public.internal_notes where id = '97000000-0000-4000-8000-000000000901' and person_id = '20000000-0000-4000-8000-000000000901')::bigint,
  1::bigint,
  'internal note history is re-parented'
);
select is(
  (select count(*) from public.tasks where id = '98000000-0000-4000-8000-000000000901' and person_id = '20000000-0000-4000-8000-000000000901')::bigint,
  1::bigint,
  'task history is re-parented'
);
select is(
  (select count(*) from public.consent_events where id = '99000000-0000-4000-8000-000000000901' and person_id = '20000000-0000-4000-8000-000000000901')::bigint,
  1::bigint,
  'consent history is re-parented'
);
select is(
  (select count(*) from public.person_relationships where person_id = '20000000-0000-4000-8000-000000000901')::bigint,
  2::bigint,
  'relationship associations are unioned without duplicate-key loss'
);
select is(
  (select count(*) from public.person_relationships where person_id = '20000000-0000-4000-8000-000000000902')::bigint,
  0::bigint,
  'secondary relationship join rows are cleared after union'
);
select is(
  (select count(*) from public.person_interests where person_id = '20000000-0000-4000-8000-000000000901')::bigint,
  2::bigint,
  'interest associations are unioned without duplicate-key loss'
);
select is(
  (select count(*) from public.person_interests where person_id = '20000000-0000-4000-8000-000000000902')::bigint,
  0::bigint,
  'secondary interest join rows are cleared after union'
);
select is(
  (select count(*) from public.person_tags where person_id = '20000000-0000-4000-8000-000000000901')::bigint,
  2::bigint,
  'tag associations are unioned without duplicate-key loss'
);
select is(
  (select count(*) from public.person_tags where person_id = '20000000-0000-4000-8000-000000000902')::bigint,
  0::bigint,
  'secondary tag join rows are cleared after union'
);
select is(
  (select count(*) from public.staff_person_assignments where person_id = '20000000-0000-4000-8000-000000000901')::bigint,
  2::bigint,
  'staff-person assignments are unioned without duplicate-key loss'
);
select is(
  (select count(*) from public.staff_person_assignments where person_id = '20000000-0000-4000-8000-000000000902')::bigint,
  0::bigint,
  'secondary staff-person assignments are cleared after union'
);
select is(
  (select status::text from public.duplicate_candidates where id = '50000000-0000-4000-8000-000000000901'),
  'merged'::text,
  'resolved merge candidate is marked merged'
);
select is(
  (select reviewed_by_staff_user_id from public.duplicate_candidates where id = '50000000-0000-4000-8000-000000000901'),
  '10000000-0000-4000-8000-000000000901'::uuid,
  'resolved merge candidate records the reviewing Admin'
);
select is(
  (select status::text from public.duplicate_candidates where id = '50000000-0000-4000-8000-000000000902'),
  'merged'::text,
  'redundant open candidate involving the merged person is retired'
);
select is(
  (select status::text from public.duplicate_candidates where id = '50000000-0000-4000-8000-000000000903'),
  'open'::text,
  'existing canonical open candidate remains available for review'
);
select is(
  (select count(*) from public.activities where person_id = '20000000-0000-4000-8000-000000000901' and activity_type = 'duplicate_merged')::bigint,
  1::bigint,
  'merge creates a duplicate_merged activity on the canonical person'
);
select is(
  (select count(*) from public.admin_audit_events where action_type = 'duplicate_merged' and target_id = '20000000-0000-4000-8000-000000000901')::bigint,
  1::bigint,
  'merge appends an administrative audit event'
);
select is(
  (select count(*) from public.people where normalized_email = 'merge-secondary@test.local' and archived_at is null)::bigint,
  1::bigint,
  'transferred normalized email belongs to exactly one active person'
);
select is(
  (select first_name || '|' || last_name from public.people where id = '20000000-0000-4000-8000-000000000901'),
  'Canonical|Person'::text,
  'canonical identity fields are not overwritten by the merge'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000901","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.resolve_duplicate_candidate(
    '50000000-0000-4000-8000-000000000901',
    'merge',
    '20000000-0000-4000-8000-000000000901'
  )$$,
  '22023',
  null,
  'already-reviewed duplicate candidates cannot be resolved twice'
);
reset role;

select * from finish();
rollback;
