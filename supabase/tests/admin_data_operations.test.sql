begin;

select plan(16);

select has_table(
  'public',
  'admin_audit_events',
  'append-only admin audit table exists'
);

select has_function(
  'private',
  'append_admin_audit',
  array['text', 'text', 'uuid', 'jsonb'],
  'private audit append helper exists'
);

select ok(
  (select c.relrowsecurity
   from pg_catalog.pg_class c
   join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'admin_audit_events'),
  'admin audit events has RLS enabled'
);

select ok(
  has_table_privilege('authenticated', 'public.admin_audit_events', 'SELECT'),
  'authenticated receives SELECT only so RLS can filter audit reads'
);

select ok(
  not has_table_privilege('authenticated', 'public.admin_audit_events', 'INSERT'),
  'authenticated cannot insert audit rows directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.admin_audit_events', 'UPDATE'),
  'authenticated cannot update audit rows'
);

select ok(
  not has_table_privilege('authenticated', 'public.admin_audit_events', 'DELETE'),
  'authenticated cannot delete audit rows'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'private.append_admin_audit(text,text,uuid,jsonb)',
    'EXECUTE'
  ),
  'authenticated cannot execute the private audit append helper directly'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000701','authenticated','authenticated','audit-admin@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000702','authenticated','authenticated','audit-state@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000703','authenticated','authenticated','audit-county@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000704','authenticated','authenticated','audit-volunteer@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000705','authenticated','authenticated','audit-disabled@test.local','',now(),'{}','{}',now(),now());

insert into public.staff_users (id, auth_user_id, display_name, role, status) values
('10000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000701','Audit Admin','admin','active'),
('10000000-0000-0000-0000-000000000702','00000000-0000-0000-0000-000000000702','Audit State','state_organizer','active'),
('10000000-0000-0000-0000-000000000703','00000000-0000-0000-0000-000000000703','Audit County','county_organizer','active'),
('10000000-0000-0000-0000-000000000704','00000000-0000-0000-0000-000000000704','Audit Volunteer','volunteer_staff','active'),
('10000000-0000-0000-0000-000000000705','00000000-0000-0000-0000-000000000705','Audit Disabled','admin','disabled');

insert into public.admin_audit_events (
  id,
  actor_staff_user_id,
  action_type,
  target_type,
  target_id,
  metadata
) values (
  '30000000-0000-0000-0000-000000000701',
  '10000000-0000-0000-0000-000000000701',
  'test_event',
  'test_target',
  null,
  '{"safe":"fixture"}'::jsonb
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000701","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.admin_audit_events)::bigint, 1::bigint, 'Admin can read audit events');
select throws_ok(
  $$insert into public.admin_audit_events (actor_staff_user_id, action_type, target_type)
    values ('10000000-0000-0000-0000-000000000701', 'blocked_insert', 'test_target')$$,
  '42501',
  null,
  'Admin cannot insert audit events directly'
);
select throws_ok(
  $$update public.admin_audit_events set action_type = 'blocked_update'
    where id = '30000000-0000-0000-0000-000000000701'$$,
  '42501',
  null,
  'Admin cannot update audit events directly'
);
select throws_ok(
  $$delete from public.admin_audit_events
    where id = '30000000-0000-0000-0000-000000000701'$$,
  '42501',
  null,
  'Admin cannot delete audit events directly'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000702","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.admin_audit_events)::bigint, 0::bigint, 'State Organizer cannot read audit events');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000703","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.admin_audit_events)::bigint, 0::bigint, 'County Organizer cannot read audit events');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000704","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.admin_audit_events)::bigint, 0::bigint, 'Volunteer Staff cannot read audit events');
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000705","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.admin_audit_events)::bigint, 0::bigint, 'Disabled staff cannot read audit events');
reset role;

select * from finish();
rollback;
