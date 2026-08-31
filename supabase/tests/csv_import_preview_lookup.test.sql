begin;

select plan(4);

select ok(
  to_regprocedure('public.admin_find_csv_import_matches(text[],text[])') is not null,
  'Admin CSV import preview-match RPC exists'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000000','00000000-0000-4000-8000-000000001201','authenticated','authenticated','csv-lookup-admin@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-4000-8000-000000001202','authenticated','authenticated','csv-lookup-state@test.local','',now(),'{}','{}',now(),now());

insert into public.staff_users (id, auth_user_id, display_name, role, status) values
('10000000-0000-4000-8000-000000001201','00000000-0000-4000-8000-000000001201','CSV Lookup Admin','admin','active'),
('10000000-0000-4000-8000-000000001202','00000000-0000-4000-8000-000000001202','CSV Lookup State','state_organizer','active');

insert into public.people (
  id, first_name, last_name, email, normalized_email, phone, normalized_phone, archived_at, merged_into_person_id
) values
('20000000-0000-4000-8000-000000001201','Email','Match','lookup@example.com','lookup@example.com',null,null,null,null),
('20000000-0000-4000-8000-000000001202','Phone','Match',null,null,'(518) 555-0120','5185550120',null,null),
('20000000-0000-4000-8000-000000001203','Unrelated','Person','other@example.com','other@example.com','(518) 555-0121','5185550121',null,null),
('20000000-0000-4000-8000-000000001204','Archived','Match','archived@example.com','archived@example.com',null,null,now(),null);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000001202","role":"authenticated"}',
  true
);
set local role authenticated;
select throws_ok(
  $$select * from public.admin_find_csv_import_matches(array['lookup@example.com']::text[], array['5185550120']::text[])$$,
  '42501',
  null,
  'State Organizer cannot use the CSV import preview matcher'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000001201","role":"authenticated"}',
  true
);
set local role authenticated;
select results_eq(
  $$
    select id
    from public.admin_find_csv_import_matches(
      array['lookup@example.com','other-not-requested@example.com']::text[],
      array['5185550120']::text[]
    )
    order by id
  $$,
  $$ values
    ('20000000-0000-4000-8000-000000001201'::uuid),
    ('20000000-0000-4000-8000-000000001202'::uuid)
  $$,
  'Admin preview matcher returns only active supporters matching requested normalized contacts'
);

select is(
  (
    select count(*)
    from public.admin_find_csv_import_matches(
      array['archived@example.com']::text[],
      '{}'::text[]
    )
  )::bigint,
  0::bigint,
  'Admin preview matcher excludes archived supporters'
);
reset role;

select * from finish();
rollback;
