begin;

select plan(15);

select ok(
  to_regprocedure('public.process_get_involved_intake(text,text,text,text,text,text,text,text,text,text[],boolean,boolean)') is not null,
  'supporter intake RPC exists'
);

create temporary table intake_test_ids (label text primary key, person_id uuid not null);

insert into intake_test_ids values (
  'ada',
  public.process_get_involved_intake(
    'Ada', 'Lovelace', 'Ada@Example.COM', 'ada@example.com', '(212) 555-0101', '2125550101',
    '10001', 'New York', 'New York', array['events','volunteering'], true, true
  )
);

select is(
  (select count(*)::bigint from public.people where id = (select person_id from intake_test_ids where label='ada')),
  1::bigint,
  'new intake creates one canonical person'
);
select is(
  (select engagement_stage::text from public.people where id = (select person_id from intake_test_ids where label='ada')),
  'follow_up_needed'::text,
  'new intake enters follow-up-needed stage'
);
select is(
  (select c.name from public.people p join public.counties c on c.id=p.county_id where p.id=(select person_id from intake_test_ids where label='ada')),
  'New York'::text,
  'New York intake resolves county'
);
select is(
  (select count(*)::bigint from public.person_relationships pr join public.relationship_types rt on rt.id=pr.relationship_type_id where pr.person_id=(select person_id from intake_test_ids where label='ada') and rt.slug='supporter'),
  1::bigint,
  'supporter relationship is attached'
);
select is(
  (select count(*)::bigint from public.person_interests where person_id=(select person_id from intake_test_ids where label='ada')),
  2::bigint,
  'submitted interests are attached'
);
select is(
  (select count(*)::bigint from public.consent_events where person_id=(select person_id from intake_test_ids where label='ada')),
  3::bigint,
  'explicit email and phone consent creates three channel events'
);
select is(
  (select count(*)::bigint from public.activities where person_id=(select person_id from intake_test_ids where label='ada') and activity_type='form_submitted'),
  1::bigint,
  'form submission creates activity history'
);
select is(
  (select count(*)::bigint from public.tasks where person_id=(select person_id from intake_test_ids where label='ada') and task_type='initial_follow_up' and status='open' and queue_scope='county'),
  1::bigint,
  'New York intake creates one county follow-up task'
);

select public.process_get_involved_intake(
  'Ada', 'Lovelace', 'ADA@example.com', 'ada@example.com', null, null, '12207', 'Albany', 'Albany',
  array['communications'], false, false
);

select is(
  (select count(*)::bigint from public.people where normalized_email='ada@example.com'),
  1::bigint,
  'normalized email reuses an existing person'
);
select is(
  (select count(*)::bigint from public.person_sources where person_id=(select person_id from intake_test_ids where label='ada')),
  2::bigint,
  'repeat submission preserves a second source occurrence'
);
select is(
  (select count(*)::bigint from public.tasks where person_id=(select person_id from intake_test_ids where label='ada') and task_type='initial_follow_up' and status='open'),
  1::bigint,
  'repeat submission does not duplicate the open initial follow-up task'
);

insert into public.people (first_name,last_name,phone,normalized_phone,zip_code,engagement_stage)
values ('Robert','Smith','5185550000','5185550000','12207','contacted');

insert into intake_test_ids values (
  'alice',
  public.process_get_involved_intake(
    'Alice','Jones','alice@example.com','alice@example.com','5185550000','5185550000','12207','Albany','Albany',
    array[]::text[],false,false
  )
);

select is(
  (select count(*)::bigint from public.duplicate_candidates where status='open' and reason='normalized_phone_match_without_name_match'),
  1::bigint,
  'ambiguous phone creates a duplicate candidate instead of merging'
);

insert into intake_test_ids values (
  'outstate',
  public.process_get_involved_intake(
    'Grace','Hopper','grace@example.com','grace@example.com',null,null,'90210',null,'Beverly Hills',
    array['data-research'],false,false
  )
);

select is(
  (select count(*)::bigint from public.tasks where person_id=(select person_id from intake_test_ids where label='outstate') and task_type='initial_follow_up' and status='open' and queue_scope='statewide' and queue_county_id is null),
  1::bigint,
  'out-of-state intake enters the statewide queue'
);
select is(
  (select count(*)::bigint from public.consent_events where person_id=(select person_id from intake_test_ids where label='outstate')),
  0::bigint,
  'unchecked consent creates no opt-out or opt-in events'
);

select ok(
  not has_function_privilege('anon', 'public.process_get_involved_intake(text,text,text,text,text,text,text,text,text,text[],boolean,boolean)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.process_get_involved_intake(text,text,text,text,text,text,text,text,text,text[],boolean,boolean)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.process_get_involved_intake(text,text,text,text,text,text,text,text,text,text[],boolean,boolean)', 'EXECUTE'),
  'only service_role can execute the public intake RPC'
);

select * from finish();
rollback;
