create extension if not exists pgcrypto;
create extension if not exists pgtap with schema extensions;

create type public.staff_role as enum (
  'admin',
  'state_organizer',
  'county_organizer',
  'volunteer_staff'
);

create type public.staff_status as enum ('active', 'disabled');

create table public.counties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  fips_code text not null unique check (fips_code ~ '^36[0-9]{3}$'),
  created_at timestamptz not null default now()
);

create table public.staff_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  display_name text not null check (length(trim(display_name)) > 0),
  role public.staff_role not null,
  status public.staff_status not null default 'active',
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_counties (
  staff_user_id uuid not null references public.staff_users(id) on delete cascade,
  county_id uuid not null references public.counties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (staff_user_id, county_id)
);

create index staff_users_auth_user_id_idx on public.staff_users(auth_user_id);
create index staff_counties_county_id_idx on public.staff_counties(county_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger staff_users_set_updated_at
before update on public.staff_users
for each row execute function public.set_updated_at();
