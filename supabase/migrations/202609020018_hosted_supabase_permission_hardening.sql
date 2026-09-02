-- Hosted Supabase grants broad default privileges to API roles when public-schema
-- tables/functions are created. Keep counties publicly readable for intake lookup,
-- but make the lookup table read-only and remove unintended direct RPC execution.

alter table public.counties enable row level security;

revoke insert, update, delete, truncate, references, trigger
  on table public.counties from public, anon, authenticated;

grant select on table public.counties to anon, authenticated, service_role;

drop policy if exists counties_public_read on public.counties;
create policy counties_public_read
on public.counties
for select
to anon, authenticated
using (true);

-- These staff-management routines are intentionally callable by authenticated
-- staff only; their internal role checks remain authoritative as defense in depth.
revoke execute on function public.admin_register_staff_user(
  uuid,
  text,
  public.staff_role,
  uuid[]
) from public, anon;

revoke execute on function public.admin_update_staff_access(
  uuid,
  public.staff_role,
  public.staff_status,
  uuid[]
) from public, anon;

-- Trigger-only helper. Triggers do not require API callers to have EXECUTE.
revoke execute on function public.sync_person_last_activity()
  from public, anon, authenticated;
