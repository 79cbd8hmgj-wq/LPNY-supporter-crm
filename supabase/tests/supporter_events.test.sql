begin;

select plan(12);

select has_type('public', 'crm_event_visibility', 'event visibility enum exists');
select has_column('public', 'crm_events', 'visibility', 'crm_events has a visibility boundary');
select has_function('public', 'list_my_upcoming_events', array['integer'], 'supporter upcoming-events RPC exists');
select has_function('public', 'set_crm_event_visibility', array['uuid', 'crm_event_visibility'], 'staff event publication RPC exists');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000711','00000000-0000-0000-0000-000000000711','authenticated','authenticated','events-supporter@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000711','00000000-0000-0000-0000-000000000712','authenticated','authenticated','events-staff@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000711','00000000-0000-0000-0000-000000000713','authenticated','authenticated','events-unlinked@example.test','',now(),'{}','{}',now(),now());

insert into public.people (
  id, first_name, last_name, email, normalized_email, zip_code
) values (
  '20000000-0000-0000-0000-000000000711',
  'Event',
  'Supporter',
  'events-supporter@example.test',
  'events-supporter@example.test',
  '12207'
);

insert into public.person_relationships (person_id, relationship_type_id)
select
  '20000000-0000-0000-0000-000000000711',
  id
from public.relationship_types
where slug = 'supporter'
  and active = true;

insert into public.supporter_accounts (auth_user_id, person_id)
values (
  '00000000-0000-0000-0000-000000000711',
  '20000000-0000-0000-0000-000000000711'
);

insert into public.staff_users (
  id, auth_user_id, display_name, role, status
) values (
  '10000000-0000-0000-0000-000000000712',
  '00000000-0000-0000-0000-000000000712',
  'Event Publisher',
  'state_organizer',
  'active'
);

insert into public.crm_events (
  id, title, description, location, starts_at, ends_at, created_by_staff_user_id, visibility
) values
(
  '30000000-0000-0000-0000-000000000711',
  'Staff Planning',
  'Internal event',
  'Albany',
  now() + interval '1 day',
  null,
  '10000000-0000-0000-0000-000000000712',
  'staff'
),
(
  '30000000-0000-0000-0000-000000000712',
  'Supporter Meetup',
  'Supporter event',
  'Albany',
  now() + interval '2 days',
  null,
  '10000000-0000-0000-0000-000000000712',
  'supporters'
),
(
  '30000000-0000-0000-0000-000000000713',
  'Public Rally',
  'Public event',
  'Troy',
  now() + interval '3 days',
  null,
  '10000000-0000-0000-0000-000000000712',
  'public'
),
(
  '30000000-0000-0000-0000-000000000714',
  'Past Meetup',
  'Past supporter event',
  'Albany',
  now() - interval '1 day',
  null,
  '10000000-0000-0000-0000-000000000712',
  'supporters'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000711","role":"authenticated","email":"events-supporter@example.test"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.crm_events)::bigint,
  0::bigint,
  'Supporters cannot query internal crm_events rows directly'
);

select is(
  (select count(*) from public.list_my_upcoming_events())::bigint,
  2::bigint,
  'Supporter event feed includes only future supporter/public events'
);

select is(
  (select array_agg(title order by starts_at) from public.list_my_upcoming_events()),
  array['Supporter Meetup', 'Public Rally']::text[],
  'Supporter event feed is chronological and excludes staff-only events'
);

select throws_ok(
  $$select public.set_crm_event_visibility(
      '30000000-0000-0000-0000-000000000711',
      'supporters'::public.crm_event_visibility
    )$$,
  '42501',
  null,
  'Supporters cannot publish staff events'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000713","role":"authenticated","email":"events-unlinked@example.test"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.list_my_upcoming_events())::bigint,
  0::bigint,
  'Authenticated users without a supporter mapping receive no supporter event feed'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000712","role":"authenticated","email":"events-staff@example.test"}',
  true
);
set local role authenticated;

select lives_ok(
  $$select public.set_crm_event_visibility(
      '30000000-0000-0000-0000-000000000711',
      'supporters'::public.crm_event_visibility
    )$$,
  'Active staff can publish an event to supporters'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000711","role":"authenticated","email":"events-supporter@example.test"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.list_my_upcoming_events())::bigint,
  3::bigint,
  'Published event becomes visible to the supporter feed'
);

select is(
  (select count(*) from public.list_my_upcoming_events(1))::bigint,
  1::bigint,
  'Supporter event feed enforces its requested bounded limit'
);

reset role;

select * from finish();
rollback;
