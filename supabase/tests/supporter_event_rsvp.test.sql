begin;

select plan(12);

select has_table('public', 'crm_event_rsvps', 'event RSVP table exists');

select has_function(
  'public',
  'set_my_event_rsvp',
  array['uuid','boolean'],
  'supporter RSVP RPC exists'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
('00000000-0000-0000-0000-000000000741','00000000-0000-0000-0000-000000000741','authenticated','authenticated','rsvp-supporter@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000741','00000000-0000-0000-0000-000000000742','authenticated','authenticated','rsvp-unlinked@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000741','00000000-0000-0000-0000-000000000743','authenticated','authenticated','rsvp-staff@example.test','',now(),'{}','{}',now(),now());

insert into public.people (
  id, first_name, last_name, email, normalized_email, zip_code
) values (
  '20000000-0000-0000-0000-000000000741',
  'RSVP',
  'Supporter',
  'rsvp-supporter@example.test',
  'rsvp-supporter@example.test',
  '12207'
);

insert into public.person_relationships (person_id, relationship_type_id)
select
  '20000000-0000-0000-0000-000000000741',
  id
from public.relationship_types
where slug = 'supporter'
  and active = true;

insert into public.supporter_accounts (auth_user_id, person_id)
values (
  '00000000-0000-0000-0000-000000000741',
  '20000000-0000-0000-0000-000000000741'
);

insert into public.staff_users (
  id, auth_user_id, display_name, role, status
) values (
  '30000000-0000-0000-0000-000000000741',
  '00000000-0000-0000-0000-000000000743',
  'RSVP Staff',
  'state_organizer',
  'active'
);

insert into public.crm_events (
  id, title, starts_at, created_by_staff_user_id, visibility
) values
(
  '40000000-0000-0000-0000-000000000741',
  'Visible Future Event',
  now() + interval '2 days',
  '30000000-0000-0000-0000-000000000741',
  'supporters'
),
(
  '40000000-0000-0000-0000-000000000742',
  'Private Future Event',
  now() + interval '3 days',
  '30000000-0000-0000-0000-000000000741',
  'staff'
),
(
  '40000000-0000-0000-0000-000000000743',
  'Past Event',
  now() - interval '1 day',
  '30000000-0000-0000-0000-000000000741',
  'supporters'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000741","role":"authenticated","email":"rsvp-supporter@example.test"}',
  true
);
set local role authenticated;

select is(
  public.set_my_event_rsvp('40000000-0000-0000-0000-000000000741', true)::text,
  'going'::text,
  'supporter can RSVP to a future supporter-visible event'
);

select is(
  (
    select rsvp_status::text
    from public.list_my_upcoming_events(20)
    where id = '40000000-0000-0000-0000-000000000741'
  ),
  'going'::text,
  'upcoming-event feed includes supporter RSVP status'
);

select throws_ok(
  $$select public.set_my_event_rsvp('40000000-0000-0000-0000-000000000742', true)$$,
  'P0002',
  null,
  'supporter cannot RSVP to a staff-only event'
);

select throws_ok(
  $$select public.set_my_event_rsvp('40000000-0000-0000-0000-000000000743', true)$$,
  'P0002',
  null,
  'supporter cannot RSVP to an event that already started'
);

select is(
  public.set_my_event_rsvp('40000000-0000-0000-0000-000000000741', false)::text,
  'cancelled'::text,
  'supporter can cancel their own RSVP'
);

reset role;

select is(
  (
    select status::text
    from public.crm_event_rsvps
    where event_id = '40000000-0000-0000-0000-000000000741'
      and person_id = '20000000-0000-0000-0000-000000000741'
  ),
  'cancelled'::text,
  'cancellation is retained as RSVP history state'
);

select is(
  (
    select count(*)
    from public.activities
    where person_id = '20000000-0000-0000-0000-000000000741'
      and activity_type = 'supporter_event_rsvp'
  )::bigint,
  1::bigint,
  'initial RSVP creates one CRM activity marker'
);

select is(
  (
    select count(*)
    from public.activities
    where person_id = '20000000-0000-0000-0000-000000000741'
      and activity_type = 'supporter_event_rsvp_cancelled'
  )::bigint,
  1::bigint,
  'RSVP cancellation creates one CRM activity marker'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000741","role":"authenticated","email":"rsvp-supporter@example.test"}',
  true
);
set local role authenticated;

select is(
  (select count(*) from public.crm_event_rsvps)::bigint,
  0::bigint,
  'supporters cannot directly read RSVP table rows'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000742","role":"authenticated","email":"rsvp-unlinked@example.test"}',
  true
);

select throws_ok(
  $$select public.set_my_event_rsvp('40000000-0000-0000-0000-000000000741', true)$$,
  '42501',
  null,
  'authenticated users without supporter mappings cannot RSVP'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000743","role":"authenticated","email":"rsvp-staff@example.test"}',
  true
);
set local role authenticated;

select is(
  (
    select count(*)
    from public.crm_event_rsvps
    where event_id = '40000000-0000-0000-0000-000000000741'
  )::bigint,
  1::bigint,
  'active staff can read RSVP rows for event organizing'
);

reset role;

select * from finish();
rollback;
