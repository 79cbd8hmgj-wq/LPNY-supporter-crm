create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.staff_users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index saved_views_staff_name_unique_idx
  on public.saved_views(staff_user_id, lower(trim(name)));
create index saved_views_staff_updated_idx
  on public.saved_views(staff_user_id, updated_at desc);

create trigger saved_views_set_updated_at
before update on public.saved_views
for each row execute function public.set_updated_at();

alter table public.saved_views enable row level security;

create policy saved_views_select on public.saved_views
for select to authenticated
using (
  private.is_active_staff()
  and staff_user_id = private.current_staff_user_id()
);

create policy saved_views_insert on public.saved_views
for insert to authenticated
with check (
  private.is_active_staff()
  and staff_user_id = private.current_staff_user_id()
);

create policy saved_views_update on public.saved_views
for update to authenticated
using (
  private.is_active_staff()
  and staff_user_id = private.current_staff_user_id()
)
with check (
  private.is_active_staff()
  and staff_user_id = private.current_staff_user_id()
);

create policy saved_views_delete on public.saved_views
for delete to authenticated
using (
  private.is_active_staff()
  and staff_user_id = private.current_staff_user_id()
);

revoke all on table public.saved_views from anon;
grant select, insert, update, delete on table public.saved_views to authenticated;
