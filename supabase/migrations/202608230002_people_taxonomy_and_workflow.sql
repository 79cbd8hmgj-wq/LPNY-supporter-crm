create type public.engagement_stage as enum ('new', 'follow_up_needed', 'contacted', 'engaged', 'inactive');
create type public.task_priority as enum ('low', 'normal', 'high');
create type public.task_status as enum ('open', 'completed', 'cancelled');
create type public.task_queue_scope as enum ('statewide', 'county');
create type public.consent_channel as enum ('email', 'sms', 'phone');
create type public.consent_state as enum ('opted_in', 'opted_out');
create type public.duplicate_status as enum ('open', 'merged', 'kept_separate');

create table public.people (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (length(trim(first_name)) > 0),
  last_name text not null check (length(trim(last_name)) > 0),
  email text,
  normalized_email text,
  phone text,
  normalized_phone text,
  zip_code text check (zip_code is null or zip_code ~ '^[0-9]{5}$'),
  county_id uuid references public.counties(id) on delete set null,
  municipality text,
  engagement_stage public.engagement_stage not null default 'new',
  assigned_staff_user_id uuid references public.staff_users(id) on delete set null,
  do_not_contact boolean not null default false,
  archived_at timestamptz,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index people_normalized_email_unique_idx
  on public.people(normalized_email)
  where normalized_email is not null and archived_at is null;
create index people_normalized_phone_idx on public.people(normalized_phone) where normalized_phone is not null;
create index people_county_id_idx on public.people(county_id);
create index people_assigned_staff_user_id_idx on public.people(assigned_staff_user_id);
create index people_engagement_stage_idx on public.people(engagement_stage);
create index people_last_activity_at_idx on public.people(last_activity_at desc nulls last);

create trigger people_set_updated_at
before update on public.people
for each row execute function public.set_updated_at();

create table public.relationship_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  active boolean not null default true
);

create table public.person_relationships (
  person_id uuid not null references public.people(id) on delete cascade,
  relationship_type_id uuid not null references public.relationship_types(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (person_id, relationship_type_id)
);

create table public.interests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  active boolean not null default true
);

create table public.person_interests (
  person_id uuid not null references public.people(id) on delete cascade,
  interest_id uuid not null references public.interests(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (person_id, interest_id)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_by_staff_user_id uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.person_tags (
  person_id uuid not null references public.people(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (person_id, tag_id)
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null check (length(trim(category)) > 0),
  name text not null check (length(trim(name)) > 0),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.person_sources (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index person_sources_person_id_idx on public.person_sources(person_id);
create index person_sources_source_id_idx on public.person_sources(source_id);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  activity_type text not null check (length(trim(activity_type)) > 0),
  actor_staff_user_id uuid references public.staff_users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index activities_person_occurred_idx on public.activities(person_id, occurred_at desc);

create or replace function public.sync_person_last_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.people
     set last_activity_at = greatest(coalesce(last_activity_at, '-infinity'::timestamptz), new.occurred_at)
   where id = new.person_id;
  return new;
end;
$$;

create trigger activities_sync_person_last_activity
after insert on public.activities
for each row execute function public.sync_person_last_activity();

create table public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  author_staff_user_id uuid not null references public.staff_users(id) on delete restrict,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index internal_notes_person_id_idx on public.internal_notes(person_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  assignee_staff_user_id uuid references public.staff_users(id) on delete set null,
  queue_scope public.task_queue_scope,
  queue_county_id uuid references public.counties(id) on delete set null,
  task_type text not null check (length(trim(task_type)) > 0),
  due_at timestamptz,
  priority public.task_priority not null default 'normal',
  status public.task_status not null default 'open',
  completed_at timestamptz,
  created_by_staff_user_id uuid references public.staff_users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (queue_scope = 'county' and queue_county_id is not null)
    or (queue_scope = 'statewide' and queue_county_id is null)
    or queue_scope is null
  ),
  check ((status = 'completed') = (completed_at is not null))
);
create index tasks_person_status_idx on public.tasks(person_id, status);
create index tasks_assignee_status_idx on public.tasks(assignee_staff_user_id, status);
create index tasks_queue_idx on public.tasks(queue_scope, queue_county_id, status);
create index tasks_due_open_idx on public.tasks(due_at) where status = 'open';

create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  channel public.consent_channel not null,
  state public.consent_state not null,
  effective_at timestamptz not null default now(),
  source_id uuid references public.sources(id) on delete set null,
  actor_staff_user_id uuid references public.staff_users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);
create index consent_events_current_idx on public.consent_events(person_id, channel, effective_at desc);

create table public.staff_person_assignments (
  staff_user_id uuid not null references public.staff_users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (staff_user_id, person_id)
);
create index staff_person_assignments_person_id_idx on public.staff_person_assignments(person_id);

create table public.duplicate_candidates (
  id uuid primary key default gen_random_uuid(),
  person_a_id uuid not null references public.people(id) on delete cascade,
  person_b_id uuid not null references public.people(id) on delete cascade,
  reason text not null check (length(trim(reason)) > 0),
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  status public.duplicate_status not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_staff_user_id uuid references public.staff_users(id) on delete set null,
  check (person_a_id <> person_b_id)
);
create unique index duplicate_candidates_open_pair_idx
  on public.duplicate_candidates(least(person_a_id, person_b_id), greatest(person_a_id, person_b_id))
  where status = 'open';
