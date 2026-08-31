begin;

select plan(8);

select has_table('public', 'saved_views', 'saved_views exists');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000301','authenticated','authenticated','saved-a@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000302','authenticated','authenticated','saved-b@test.local','',now(),'{}','{}',now(),now());

insert into public.staff_users (id, auth_user_id, display_name, role, status) values
('10000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000301','Saved View A','state_organizer','active'),
('10000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000302','Saved View B','state_organizer','active');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000301","role":"authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$insert into public.saved_views (staff_user_id, name, filters)
    values ('10000000-0000-0000-0000-000000000301', 'Albany follow-up', '{"stage":"follow_up_needed"}'::jsonb)$$,
  'Staff user can create a private saved view for themselves'
);
select is(
  (select count(*) from public.saved_views)::bigint,
  1::bigint,
  'Staff user can read their own saved view'
);
select throws_ok(
  $$insert into public.saved_views (staff_user_id, name, filters)
    values ('10000000-0000-0000-0000-000000000302', 'Not mine', '{}'::jsonb)$$,
  '42501',
  null,
  'Staff user cannot create a saved view owned by someone else'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000302","role":"authenticated"}', true);
set local role authenticated;
select is(
  (select count(*) from public.saved_views)::bigint,
  0::bigint,
  'Another staff user cannot read someone else''s saved view'
);
update public.saved_views
set name = 'Hijacked'
where staff_user_id = '10000000-0000-0000-0000-000000000301';
reset role;
select is(
  (select name from public.saved_views where staff_user_id = '10000000-0000-0000-0000-000000000301'),
  'Albany follow-up'::text,
  'Another staff user cannot rename someone else''s saved view'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000302","role":"authenticated"}', true);
set local role authenticated;
delete from public.saved_views
where staff_user_id = '10000000-0000-0000-0000-000000000301';
reset role;
select is(
  (select count(*) from public.saved_views where staff_user_id = '10000000-0000-0000-0000-000000000301')::bigint,
  1::bigint,
  'Another staff user cannot delete someone else''s saved view'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000301","role":"authenticated"}', true);
set local role authenticated;
delete from public.saved_views
where staff_user_id = '10000000-0000-0000-0000-000000000301';
reset role;
select is(
  (select count(*) from public.saved_views where staff_user_id = '10000000-0000-0000-0000-000000000301')::bigint,
  0::bigint,
  'Owner can delete their own saved view'
);

select * from finish();
rollback;
