begin;

select plan(16);

select has_table('public', 'supporter_accounts', 'supporter_accounts exists');
select has_function('public', 'claim_supporter_account', array[]::text[], 'supporter claim RPC exists');
select has_function('public', 'get_my_supporter_profile', array[]::text[], 'safe supporter profile RPC exists');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000701','authenticated','authenticated','supporter-a@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000702','authenticated','authenticated','attacker@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000703','authenticated','authenticated','unknown@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000704','authenticated','authenticated','contact-only@example.test','',now(),'{}','{}',now(),now());

insert into public.people (
  id, first_name, last_name, email, normalized_email, zip_code, county_id, municipality
) values (
  '20000000-0000-0000-0000-000000000701',
  'Portal',
  'Supporter',
  'supporter-a@example.test',
  'supporter-a@example.test',
  '12207',
  (select id from public.counties where name = 'Albany' limit 1),
  'Albany'
), (
  '20000000-0000-0000-0000-000000000702',
  'Contact',
  'Only',
  'contact-only@example.test',
  'contact-only@example.test',
  '12207',
  (select id from public.counties where name = 'Albany' limit 1),
  'Albany'
);

insert into public.person_relationships (person_id, relationship_type_id)
select
  '20000000-0000-0000-0000-000000000701',
  id
from public.relationship_types
where slug = 'supporter'
  and active = true;

insert into public.person_interests (person_id, interest_id)
select
  '20000000-0000-0000-0000-000000000701',
  id
from public.interests
where slug = 'events';

insert into public.consent_events (person_id, channel, state)
values (
  '20000000-0000-0000-0000-000000000701',
  'email',
  'opted_in'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000701","role":"authenticated","email":"supporter-a@example.test"}',
  true
);
set local role authenticated;

select lives_ok(
  $$$select public.claim_supporter_account()$$$,
  'Verified supporter can claim the matching canonical person record'
);

select is(
  public.claim_supporter_account(),
  '20000000-0000-0000-0000-000000000701'::uuid,
  'Supporter claim is idempotent and returns the linked person'
);

select is(
  (select count(*) from public.supporter_accounts)::bigint,
  1::bigint,
  'Supporter can read only their own account mapping'
);

select is(
  (select count(*) from public.people)::bigint,
  0::bigint,
  'Supporter still cannot query internal people rows directly'
);

select is(
  (select first_name from public.get_my_supporter_profile()),
  'Portal'::text,
  'Safe profile RPC exposes supporter-facing contact information'
);

select is(
  (select interests from public.get_my_supporter_profile()),
  array['Events']::text[],
  'Safe profile RPC exposes active supporter interests'
);

select ok(
  (select email_opt_in from public.get_my_supporter_profile()),
  'Safe profile RPC exposes current email consent'
);

select is(
  (select sms_opt_in from public.get_my_supporter_profile()),
  false,
  'Missing consent is represented as not opted in'
);

select throws_ok(
  $$insert into public.supporter_accounts (auth_user_id, person_id)
    values ('00000000-0000-0000-0000-000000000702', '20000000-0000-0000-0000-000000000701')$$,
  '42501',
  null,
  'Supporters cannot directly create account mappings'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000702","role":"authenticated","email":"supporter-a@example.test"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.supporter_accounts)::bigint,
  0::bigint,
  'Another authenticated user cannot read someone else''s supporter mapping'
);

select throws_ok(
  $$select public.claim_supporter_account()$$,
  '42501',
  null,
  'A supporter record already claimed by another Auth user cannot be hijacked'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000703","role":"authenticated","email":"unknown@example.test"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.claim_supporter_account()$$,
  'P0002',
  null,
  'An authenticated email without a matching supporter record cannot claim access'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000704","role":"authenticated","email":"contact-only@example.test"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.claim_supporter_account()$$,
  'P0002',
  null,
  'An authenticated CRM contact without the Supporter relationship cannot claim portal access'
);

reset role;

select * from finish();
rollback;
