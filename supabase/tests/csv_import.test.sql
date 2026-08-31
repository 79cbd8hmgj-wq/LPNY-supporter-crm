begin;

select plan(3);

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

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000001102","role":"authenticated"}',
  true
);
set local role authenticated;
select throws_ok(
  $$select public.apply_csv_import('fixture.csv', '[]'::jsonb)$$,
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
  $$select public.apply_csv_import('fixture.csv', '[]'::jsonb)$$,
  'Admin can apply a validated CSV import batch'
);
reset role;

select * from finish();
rollback;
