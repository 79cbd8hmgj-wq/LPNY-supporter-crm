-- RLS is the authoritative row boundary for authenticated staff, but PostgreSQL
-- table privileges must permit callers to reach those policies in the first place.
-- The service role is a trusted server-only credential and therefore receives
-- explicit CRUD access to the CRM tables in addition to its RLS-bypass behavior.

revoke all on table public.people from anon;
revoke all on table public.person_relationships from anon;
revoke all on table public.person_interests from anon;
revoke all on table public.person_tags from anon;
revoke all on table public.person_sources from anon;
revoke all on table public.activities from anon;
revoke all on table public.internal_notes from anon;
revoke all on table public.tasks from anon;
revoke all on table public.consent_events from anon;
revoke all on table public.staff_person_assignments from anon;
revoke all on table public.duplicate_candidates from anon;
revoke all on table public.staff_users from anon;
revoke all on table public.staff_counties from anon;
revoke all on table public.relationship_types from anon;
revoke all on table public.interests from anon;
revoke all on table public.tags from anon;
revoke all on table public.sources from anon;

-- County names/FIPS codes are non-sensitive lookup data and will also be useful
-- to the public intake flow.
grant select on table public.counties to anon, authenticated, service_role;

grant select, insert, update, delete on table public.people to authenticated, service_role;
grant select, insert, update, delete on table public.person_relationships to authenticated, service_role;
grant select, insert, update, delete on table public.person_interests to authenticated, service_role;
grant select, insert, update, delete on table public.person_tags to authenticated, service_role;
grant select, insert, update, delete on table public.person_sources to authenticated, service_role;
grant select, insert, update, delete on table public.activities to authenticated, service_role;
grant select, insert, update, delete on table public.internal_notes to authenticated, service_role;
grant select, insert, update, delete on table public.tasks to authenticated, service_role;
grant select, insert, update, delete on table public.consent_events to authenticated, service_role;
grant select, insert, update, delete on table public.staff_person_assignments to authenticated, service_role;
grant select, insert, update, delete on table public.duplicate_candidates to authenticated, service_role;
grant select, insert, update, delete on table public.staff_users to authenticated, service_role;
grant select, insert, update, delete on table public.staff_counties to authenticated, service_role;
grant select on table public.relationship_types to authenticated, service_role;
grant select on table public.interests to authenticated, service_role;
grant select, insert, update, delete on table public.tags to authenticated, service_role;
grant select on table public.sources to authenticated, service_role;
