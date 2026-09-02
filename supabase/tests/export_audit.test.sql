begin;

select plan(6);

select ok(
  to_regprocedure('public.admin_record_people_csv_export(integer,text[])') is not null,
  'Admin CSV export audit RPC exists'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000000','00000000-0000-4000-8000-000000001601','authenticated','authenticated','export-admin@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-4000-8000-000000001602','authenticated','authenticated','export-state@test.local','',now(),'{}','{}',now(),now());

insert into public.staff_users (id, auth_user_id, display_name, role, status) values
('10000000-0000-4000-8000-000000001601','00000000-0000-4000-8000-000000001601','Export Admin','admin','active'),
('10000000-0000-4000-8000-000000001602','00000000-0000-4000-8000-000000001602','Export State','state_organizer','active');

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000001602","role":"authenticated"}',
  true
);
set local role authenticated;
select throws_ok(
  $$select public.admin_record_people_csv_export(2, array['stage']::text[])$$,
  '42501',
  null,
  'State Organizer cannot record Admin CSV exports'
);
reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000001601","role":"authenticated"}',
  true
);
set local role authenticated;
select lives_ok(
  $$select public.admin_record_people_csv_export(2, array['stage','county','stage']::text[])$$,
  'Admin can append a sanitized CSV export audit event'
);
reset role;

select is(
  (select count(*) from public.admin_audit_events where action_type = 'people_csv_exported')::bigint,
  1::bigint,
  'CSV export appends one audit event'
);

select is(
  (select metadata
   from public.admin_audit_events
   where action_type = 'people_csv_exported'
   order by occurred_at desc
   limit 1),
  '{"row_count": 2, "active_filter_keys": ["county", "stage"]}'::jsonb,
  'CSV export audit metadata contains only row count and deduplicated filter names'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000001601","role":"authenticated"}',
  true
);
set local role authenticated;
select throws_ok(
  $$select public.admin_record_people_csv_export(1, array['query=jane@example.com']::text[])$$,
  '22023',
  null,
  'CSV export audit rejects arbitrary filter values'
);
reset role;

select * from finish();
rollback;
