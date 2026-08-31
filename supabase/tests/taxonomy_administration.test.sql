begin;

select plan(23);

select ok(
  to_regprocedure('public.manage_interest(uuid,text,text,boolean)') is not null,
  'interest management RPC exists'
);
select ok(
  to_regprocedure('public.manage_tag(uuid,text,boolean)') is not null,
  'tag management RPC exists'
);
select ok(
  to_regprocedure('public.manage_source(uuid,text,text,text,boolean)') is not null,
  'source management RPC exists'
);

select ok(
  not has_table_privilege('authenticated', 'public.tags', 'INSERT'),
  'authenticated cannot bypass audited tag creation'
);
select ok(
  not has_table_privilege('authenticated', 'public.tags', 'UPDATE'),
  'authenticated cannot bypass audited tag updates'
);
select ok(
  not has_table_privilege('authenticated', 'public.tags', 'DELETE'),
  'authenticated cannot delete tags directly'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000811','authenticated','authenticated','taxonomy-admin@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000812','authenticated','authenticated','taxonomy-state@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000813','authenticated','authenticated','taxonomy-county@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000814','authenticated','authenticated','taxonomy-volunteer@test.local','',now(),'{}','{}',now(),now());

insert into public.staff_users (id, auth_user_id, display_name, role, status) values
('10000000-0000-0000-0000-000000000811','00000000-0000-0000-0000-000000000811','Taxonomy Admin','admin','active'),
('10000000-0000-0000-0000-000000000812','00000000-0000-0000-0000-000000000812','Taxonomy State','state_organizer','active'),
('10000000-0000-0000-0000-000000000813','00000000-0000-0000-0000-000000000813','Taxonomy County','county_organizer','active'),
('10000000-0000-0000-0000-000000000814','00000000-0000-0000-0000-000000000814','Taxonomy Volunteer','volunteer_staff','active');

insert into public.interests (id, slug, name, active) values
('40000000-0000-0000-0000-000000000811', 'inactive-interest-fixture', 'Inactive interest fixture', false);
insert into public.tags (id, name, active, created_by_staff_user_id) values
('40000000-0000-0000-0000-000000000812', 'Inactive tag fixture', false, '10000000-0000-0000-0000-000000000811');
insert into public.sources (id, slug, category, name, active) values
('40000000-0000-0000-0000-000000000813', 'inactive-source-fixture', 'fixture', 'Inactive source fixture', false);

insert into public.people (id, first_name, last_name, normalized_email) values
('20000000-0000-0000-0000-000000000811', 'Taxonomy', 'Reference', 'taxonomy-reference@test.local');
insert into public.person_interests (person_id, interest_id) values
('20000000-0000-0000-0000-000000000811', '40000000-0000-0000-0000-000000000811');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000811","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.interests where id = '40000000-0000-0000-0000-000000000811')::bigint, 1::bigint, 'Admin can read inactive interests');
select is((select count(*) from public.tags where id = '40000000-0000-0000-0000-000000000812')::bigint, 1::bigint, 'Admin can read inactive tags');
select is((select count(*) from public.sources where id = '40000000-0000-0000-0000-000000000813')::bigint, 1::bigint, 'Admin can read inactive sources');
select lives_ok(
  $$select public.manage_interest(null, 'Voting Rights', 'voting-rights', true)$$,
  'Admin can create an interest'
);
select lives_ok(
  $$select public.manage_tag(null, 'Petition signer', true)$$,
  'Admin can create a tag'
);
select lives_ok(
  $$select public.manage_source(null, 'Town Hall', 'town-hall', 'event', true)$$,
  'Admin can create a source'
);
select is((select count(*) from public.admin_audit_events where action_type = 'taxonomy_created')::bigint, 3::bigint, 'taxonomy creates append audit events');
select lives_ok(
  $$select public.manage_interest('40000000-0000-0000-0000-000000000811', 'Renamed interest fixture', 'attempted-new-slug', false)$$,
  'Admin can rename an existing interest'
);
select is(
  (select slug from public.interests where id = '40000000-0000-0000-0000-000000000811'),
  'inactive-interest-fixture'::text,
  'renaming an interest preserves its stable slug'
);
select is(
  (select count(*) from public.person_interests where person_id = '20000000-0000-0000-0000-000000000811' and interest_id = '40000000-0000-0000-0000-000000000811')::bigint,
  1::bigint,
  'deactivated taxonomy rows remain safely referenced'
);
select is((select count(*) from public.admin_audit_events where action_type = 'taxonomy_updated')::bigint, 1::bigint, 'taxonomy updates append audit events');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000812","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.interests where id = '40000000-0000-0000-0000-000000000811')::bigint, 1::bigint, 'State Organizer can read inactive interests');
select lives_ok(
  $$select public.manage_source('40000000-0000-0000-0000-000000000813', 'Inactive source renamed', 'ignored-new-slug', 'fixture', false)$$,
  'State Organizer can manage sources'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000813","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.interests where id = '40000000-0000-0000-0000-000000000811')::bigint, 0::bigint, 'County Organizer cannot read inactive interests');
select throws_ok(
  $$select public.manage_tag(null, 'Blocked county tag', true)$$,
  '42501',
  null,
  'County Organizer cannot manage taxonomies'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000814","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.sources where id = '40000000-0000-0000-0000-000000000813')::bigint, 0::bigint, 'Volunteer Staff cannot read inactive sources');
select throws_ok(
  $$select public.manage_interest(null, 'Blocked volunteer interest', 'blocked-volunteer-interest', true)$$,
  '42501',
  null,
  'Volunteer Staff cannot manage taxonomies'
);
reset role;

select * from finish();
rollback;
