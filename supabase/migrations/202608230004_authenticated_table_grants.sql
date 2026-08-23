-- RLS is the authoritative row boundary, but PostgreSQL table privileges must
-- permit authenticated staff to reach the policies in the first place.

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
-- to the future public intake flow.
grant select on table public.counties to anon, authenticated;

grant select, insert, update, delete on table public.people to authenticated;
grant select, insert, update, delete on table public.person_relationships to authenticated;
grant select, insert, update, delete on table public.person_interests to authenticated;
grant select, insert, update, delete on table public.person_tags to authenticated;
grant select, insert, update, delete on table public.person_sources to authenticated;
grant select, insert, update, delete on table public.activities to authenticated;
grant select, insert, update, delete on table public.internal_notes to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.consent_events to authenticated;
grant select, insert, update, delete on table public.staff_person_assignments to authenticated;
grant select, insert, update, delete on table public.duplicate_candidates to authenticated;
grant select, insert, update, delete on table public.staff_users to authenticated;
grant select, insert, update, delete on table public.staff_counties to authenticated;
grant select on table public.relationship_types to authenticated;
grant select on table public.interests to authenticated;
grant select, insert, update, delete on table public.tags to authenticated;
grant select on table public.sources to authenticated;
