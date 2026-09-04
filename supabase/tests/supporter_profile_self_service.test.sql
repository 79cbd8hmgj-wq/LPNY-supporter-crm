begin;

select plan(19);

select has_function(
  'public',
  'list_supporter_interests',
  array[]::text[],
  'supporter interest-options RPC exists'
);

select has_function(
  'public',
  'update_my_supporter_profile',
  array['text','text','text','text','text','uuid','text','text[]','boolean','boolean'],
  'supporter self-service profile RPC exists'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000721','00000000-0000-0000-0000-000000000721','authenticated','authenticated','profile-supporter@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000721','00000000-0000-0000-0000-000000000722','authenticated','authenticated','profile-unlinked@example.test','',now(),'{}','{}',now(),now());

insert into public.people (
  id, first_name, last_name, email, normalized_email, phone, normalized_phone,
  zip_code, county_id, municipality, engagement_stage
) values (
  '20000000-0000-0000-0000-000000000721',
  'Old',
  'Name',
  'profile-supporter@example.test',
  'profile-supporter@example.test',
  '518-555-0100',
  '5185550100',
  '12207',
  (select id from public.counties where name = 'Albany' limit 1),
  'Albany',
  'engaged'
);

insert into public.person_relationships (person_id, relationship_type_id)
select
  '20000000-0000-0000-0000-000000000721',
  id
from public.relationship_types
where slug = 'supporter'
  and active = true;

insert into public.supporter_accounts (auth_user_id, person_id)
values (
  '00000000-0000-0000-0000-000000000721',
  '20000000-0000-0000-0000-000000000721'
);

insert into public.person_interests (person_id, interest_id)
select '20000000-0000-0000-0000-000000000721', id
from public.interests
where slug = 'events';

insert into public.consent_events (person_id, channel, state)
values
('20000000-0000-0000-0000-000000000721', 'email', 'opted_out'),
('20000000-0000-0000-0000-000000000721', 'sms', 'opted_out'),
('20000000-0000-0000-0000-000000000721', 'phone', 'opted_out');

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000721","role":"authenticated","email":"profile-supporter@example.test"}',
  true
);
set local role authenticated;

select ok(
  exists(select 1 from public.list_supporter_interests() where slug = 'events'),
  'Linked supporter can load active interest choices'
);

select is(
  (select count(*) from public.people)::bigint,
  0::bigint,
  'Supporter still cannot directly read internal people rows'
);

select lives_ok(
  $$select public.update_my_supporter_profile(
      'Updated',
      'Supporter',
      '(315) 555-0199',
      '3155550199',
      '13202',
      (select id from public.counties where name = 'Onondaga' limit 1),
      'Syracuse',
      array['events','volunteering'],
      true,
      true
    )$$,
  'Supporter can update their own public-facing profile'
);

reset role;

select is(
  (select first_name from public.people where id = '20000000-0000-0000-0000-000000000721'),
  'Updated'::text,
  'Self-service update changes first name'
);

select is(
  (select last_name from public.people where id = '20000000-0000-0000-0000-000000000721'),
  'Supporter'::text,
  'Self-service update changes last name'
);

select is(
  (select normalized_phone from public.people where id = '20000000-0000-0000-0000-000000000721'),
  '3155550199'::text,
  'Self-service update normalizes phone through the validated boundary'
);

select is(
  (select zip_code from public.people where id = '20000000-0000-0000-0000-000000000721'),
  '13202'::text,
  'Self-service update changes ZIP'
);

select is(
  (
    select c.name
    from public.people p
    join public.counties c on c.id = p.county_id
    where p.id = '20000000-0000-0000-0000-000000000721'
  ),
  'Onondaga'::text,
  'Self-service update changes canonical county'
);

select is(
  (select municipality from public.people where id = '20000000-0000-0000-0000-000000000721'),
  'Syracuse'::text,
  'Self-service update changes municipality'
);

select is(
  (
    select array_agg(i.slug order by i.slug)
    from public.person_interests pi
    join public.interests i on i.id = pi.interest_id
    where pi.person_id = '20000000-0000-0000-0000-000000000721'
  ),
  array['events','volunteering']::text[],
  'Self-service update replaces only supporter interests'
);

select is(
  (
    select state::text
    from public.consent_events
    where person_id = '20000000-0000-0000-0000-000000000721'
      and channel = 'email'
    order by effective_at desc, id desc
    limit 1
  ),
  'opted_in'::text,
  'Self-service update records email consent'
);

select is(
  (
    select state::text
    from public.consent_events
    where person_id = '20000000-0000-0000-0000-000000000721'
      and channel = 'sms'
    order by effective_at desc, id desc
    limit 1
  ),
  'opted_in'::text,
  'Self-service update records SMS consent'
);

select is(
  (
    select state::text
    from public.consent_events
    where person_id = '20000000-0000-0000-0000-000000000721'
      and channel = 'phone'
    order by effective_at desc, id desc
    limit 1
  ),
  'opted_in'::text,
  'Self-service update records phone consent'
);

select is(
  (
    select count(*)
    from public.activities
    where person_id = '20000000-0000-0000-0000-000000000721'
      and activity_type = 'supporter_profile_updated'
  )::bigint,
  1::bigint,
  'Self-service update leaves an internal activity marker without copying PII'
);

select is(
  (select engagement_stage::text from public.people where id = '20000000-0000-0000-0000-000000000721'),
  'engaged'::text,
  'Supporter self-service does not modify internal engagement stage'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000722","role":"authenticated","email":"profile-unlinked@example.test"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.update_my_supporter_profile(
      'Unlinked',
      'User',
      null,
      null,
      '12207',
      (select id from public.counties where name = 'Albany' limit 1),
      'Albany',
      array['events'],
      false,
      false
    )$$,
  '42501',
  null,
  'Authenticated users without a supporter mapping cannot update profiles'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000721","role":"authenticated","email":"profile-supporter@example.test"}',
  true
);
set local role authenticated;

select throws_ok(
  $$select public.update_my_supporter_profile(
      'Updated',
      'Supporter',
      null,
      null,
      '13202',
      (select id from public.counties where name = 'Onondaga' limit 1),
      'Syracuse',
      array['not-a-real-interest'],
      true,
      false
    )$$,
  '22023',
  null,
  'Unknown interest slugs are rejected rather than silently mutating profile data'
);

reset role;

select * from finish();
rollback;
