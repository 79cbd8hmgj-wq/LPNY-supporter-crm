begin;

select plan(24);

select ok(
  to_regprocedure('public.apply_csv_import(text,jsonb)') is not null,
  'Admin CSV import RPC exists'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000000','00000000-0000-4000-8000-000000001101','authenticated','authenticated','csv-admin@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-4000-8000-000000001102','authenticated','authenticated','csv-state@test.local','',now(),'{}','{}',now(),now());

insert into public.staff_users (id, auth_user_id, display_name, role, status) values
('10000000-0000-4000-8000-000000001101','00000000-0000-4000-8000-000000001101','CSV Admin','admin','active'),
('10000000-0000-4000-8000-000000001102','00000000-0000-4000-8000-000000001102','CSV State','state_organizer','active');

insert into public.tags (id, name, active, created_by_staff_user_id)
values ('30000000-0000-4000-8000-000000001101', 'Legacy', true, '10000000-0000-4000-8000-000000001101');

insert into public.sources (id, slug, category, name, active)
values ('40000000-0000-4000-8000-000000001101', 'legacy-list', 'import', 'Legacy List', true);

insert into public.people (
  id, first_name, last_name, email, normalized_email, engagement_stage,
  do_not_contact, phone, normalized_phone, zip_code, county_id, municipality
) values
(
  '20000000-0000-4000-8000-000000001101',
  'Original',
  'EmailMatch',
  'exact@example.com',
  'exact@example.com',
  'engaged',
  true,
  null,
  null,
  null,
  null,
  null
),
(
  '20000000-0000-4000-8000-000000001102',
  'Existing',
  'Doe',
  null,
  null,
  'contacted',
  false,
  '(518) 555-0102',
  '5185550102',
  '12180',
  (select id from public.counties where name = 'Rensselaer'),
  'Troy'
);

insert into public.person_relationships (person_id, relationship_type_id)
select
  '20000000-0000-4000-8000-000000001101',
  rt.id
from public.relationship_types rt
where rt.slug = 'supporter';

create temporary table csv_import_result (result jsonb);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000001102","role":"authenticated"}',
  true
);
set local role authenticated;
select throws_ok(
  $$select public.apply_csv_import('blocked.csv', '[]'::jsonb)$$,
  '42501',
  null,
  'State Organizer cannot apply CSV imports'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000001101","role":"authenticated"}',
  true
);
set local role authenticated;
select lives_ok(
  $apply$
    insert into pg_temp.csv_import_result(result)
    select public.apply_csv_import(
      'supporters-sensitive-name.csv',
      $json$[
        {
          "row_number": 2,
          "decision": "update_existing",
          "existing_person_id": "20000000-0000-4000-8000-000000001101",
          "first_name": "Changed",
          "last_name": "EmailMatch",
          "email": "exact@example.com",
          "normalized_email": "exact@example.com",
          "phone": "(518) 555-0199",
          "normalized_phone": "5185550199",
          "zip_code": "12207",
          "county_name": "Albany",
          "municipality": "Albany",
          "engagement_stage": "new",
          "relationship": "activist",
          "interests": ["events"],
          "tags": ["Legacy"],
          "source": "legacy-list"
        },
        {
          "row_number": 3,
          "decision": "create_new",
          "first_name": "New",
          "last_name": "Doe",
          "email": "new@example.com",
          "normalized_email": "new@example.com",
          "phone": "(518) 555-0102",
          "normalized_phone": "5185550102",
          "zip_code": "12207",
          "county_name": "Albany",
          "municipality": "Albany",
          "engagement_stage": "follow_up_needed",
          "relationship": "supporter",
          "interests": ["outreach"],
          "tags": ["Legacy"],
          "source": "legacy-list"
        },
        {
          "row_number": 4,
          "decision": "skip",
          "first_name": "Skipped",
          "last_name": "Person",
          "email": "skip@example.com",
          "normalized_email": "skip@example.com"
        }
      ]$json$::jsonb
    )
  $apply$,
  'Admin can apply explicit create, update, and skip decisions transactionally'
);
reset role;

select is(
  (select (result->>'imported')::integer from csv_import_result),
  1,
  'CSV import summary reports one created person'
);
select is(
  (select (result->>'updated')::integer from csv_import_result),
  1,
  'CSV import summary reports one updated person'
);
select is(
  (select (result->>'skipped')::integer from csv_import_result),
  1,
  'CSV import summary reports one skipped row'
);

select is(
  (select count(*) from public.people where normalized_email = 'exact@example.com')::bigint,
  1::bigint,
  'exact email update does not create a duplicate person'
);
select is(
  (select first_name from public.people where id = '20000000-0000-4000-8000-000000001101'),
  'Original',
  'CSV updates do not overwrite an established first name'
);
select is(
  (select normalized_phone || ':' || zip_code || ':' || coalesce(c.name, '')
   from public.people p
   left join public.counties c on c.id = p.county_id
   where p.id = '20000000-0000-4000-8000-000000001101'),
  '5185550199:12207:Albany',
  'CSV updates fill missing phone and geography fields'
);
select is(
  (select engagement_stage::text || ':' || do_not_contact::text
   from public.people where id = '20000000-0000-4000-8000-000000001101'),
  'engaged:true',
  'CSV updates preserve engagement stage and do-not-contact state'
);

select is(
  (select count(*) from public.people where normalized_email = 'new@example.com')::bigint,
  1::bigint,
  'an explicit create-new decision creates one person even when phone matches an existing person'
);
select is(
  (select engagement_stage::text from public.people where normalized_email = 'new@example.com'),
  'follow_up_needed',
  'new CSV person receives the validated engagement stage'
);
select is(
  (select count(*) from public.people where normalized_email = 'skip@example.com')::bigint,
  0::bigint,
  'skipped CSV rows do not create people'
);

select is(
  (select count(*)
   from public.person_sources ps
   join public.sources s on s.id = ps.source_id
   where s.slug = 'csv-import'
     and ps.person_id in (
       '20000000-0000-4000-8000-000000001101',
       (select id from public.people where normalized_email = 'new@example.com')
     ))::bigint,
  2::bigint,
  'applied CSV rows receive CSV-import provenance'
);
select is(
  (select count(*)
   from public.person_sources ps
   join public.sources s on s.id = ps.source_id
   where s.slug = 'legacy-list'
     and ps.person_id in (
       '20000000-0000-4000-8000-000000001101',
       (select id from public.people where normalized_email = 'new@example.com')
     ))::bigint,
  2::bigint,
  'declared source provenance is preserved for applied rows'
);
select is(
  (select count(*)
   from public.activities
   where activity_type = 'csv_imported')::bigint,
  2::bigint,
  'each applied CSV row creates a csv_imported activity'
);

select is(
  (select count(*)
   from public.person_relationships pr
   where pr.person_id = '20000000-0000-4000-8000-000000001101')::bigint,
  2::bigint,
  'CSV update unions relationship history without deleting existing relationships'
);
select is(
  (select count(*)
   from public.person_interests pi
   join public.interests i on i.id = pi.interest_id
   where pi.person_id = '20000000-0000-4000-8000-000000001101'
     and i.slug = 'events')::bigint,
  1::bigint,
  'CSV update adds requested interests'
);
select is(
  (select count(*)
   from public.person_interests pi
   join public.interests i on i.id = pi.interest_id
   join public.people p on p.id = pi.person_id
   where p.normalized_email = 'new@example.com'
     and i.slug = 'outreach')::bigint,
  1::bigint,
  'new CSV people receive requested interests'
);
select is(
  (select count(*)
   from public.person_tags pt
   join public.tags t on t.id = pt.tag_id
   where t.name = 'Legacy')::bigint,
  2::bigint,
  'CSV import unions requested tags onto applied people'
);

select is(
  (select count(*) from public.admin_audit_events where action_type = 'csv_import_applied')::bigint,
  1::bigint,
  'CSV import appends one batch audit event'
);
select is(
  (select metadata->>'imported_count' || ':' || metadata->>'updated_count' || ':' || metadata->>'skipped_count'
   from public.admin_audit_events
   where action_type = 'csv_import_applied'
   order by occurred_at desc
   limit 1),
  '1:1:1',
  'CSV audit metadata records only summary counts'
);
select ok(
  not exists (
    select 1
    from public.admin_audit_events
    where action_type = 'csv_import_applied'
      and metadata::text ~* '(example\.com|518555|Original|Changed|New|Skipped)'
  ),
  'CSV audit metadata does not contain row contact data or names'
);
select ok(
  not exists (
    select 1
    from public.admin_audit_events
    where action_type = 'csv_import_applied'
      and metadata::text like '%supporters-sensitive-name.csv%'
  ),
  'CSV audit metadata does not contain the uploaded filename'
);

select * from finish();
rollback;
