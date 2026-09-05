begin;

select plan(9);

select has_function(
  'public',
  'sync_my_supporter_email',
  array[]::text[],
  'verified supporter email sync RPC exists'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000731','00000000-0000-0000-0000-000000000731','authenticated','authenticated','new-supporter@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000731','00000000-0000-0000-0000-000000000732','authenticated','authenticated','unlinked-email@example.test','',now(),'{}','{}',now(),now());

insert into public.people (
  id, first_name, last_name, email, normalized_email, zip_code
) values
('20000000-0000-0000-0000-000000000731','Email','Supporter','old-supporter@example.test','old-supporter@example.test','12207'),
('20000000-0000-0000-0000-000000000733','Other','Supporter','taken@example.test','taken@example.test','12207');

insert into public.person_relationships (person_id, relationship_type_id)
select p.id, rt.id
from public.people p
cross join public.relationship_types rt
where p.id in (
  '20000000-0000-0000-0000-000000000731',
  '20000000-0000-0000-0000-000000000733'
)
and rt.slug = 'supporter'
and rt.active = true;

insert into public.supporter_accounts (auth_user_id, person_id)
values (
  '00000000-0000-0000-0000-000000000731',
  '20000000-0000-0000-0000-000000000731'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000731","role":"authenticated","email":"new-supporter@example.test"}',
  true
);
set local role authenticated;

select is(
  public.sync_my_supporter_email(),
  'new-supporter@example.test'::text,
  'linked supporter can synchronize their verified Auth email'
);

reset role;

select is(
  (select email from public.people where id = '20000000-0000-0000-0000-000000000731'),
  'new-supporter@example.test'::text,
  'verified email replaces the supporter CRM email'
);

select is(
  (select normalized_email from public.people where id = '20000000-0000-0000-0000-000000000731'),
  'new-supporter@example.test'::text,
  'verified email updates normalized CRM email'
);

select is(
  (
    select count(*)
    from public.activities
    where person_id = '20000000-0000-0000-0000-000000000731'
      and activity_type = 'supporter_email_updated'
  )::bigint,
  1::bigint,
  'email synchronization records one internal activity marker'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000731","role":"authenticated","email":"new-supporter@example.test"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.sync_my_supporter_email()$$,
  'repeating synchronization with the same email is idempotent'
);

reset role;

select is(
  (
    select count(*)
    from public.activities
    where person_id = '20000000-0000-0000-0000-000000000731'
      and activity_type = 'supporter_email_updated'
  )::bigint,
  1::bigint,
  'idempotent synchronization does not duplicate activity history'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000732","role":"authenticated","email":"unlinked-email@example.test"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.sync_my_supporter_email()$$,
  '42501',
  null,
  'authenticated users without a supporter mapping cannot synchronize email'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000731","role":"authenticated","email":"taken@example.test"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.sync_my_supporter_email()$$,
  '23505',
  null,
  'verified email cannot overwrite another active supporter email'
);

reset role;

select * from finish();
rollback;
