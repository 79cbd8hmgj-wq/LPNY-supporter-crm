# Foundation, Authentication, and Core Data Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a working Next.js + Supabase CRM foundation with the approved core schema, invite-only staff access, MFA enforcement, and database-level role/county/person Row-Level Security.

**Architecture:** The Next.js App Router application owns public/protected web UI and server-side orchestration. Supabase provides PostgreSQL, Auth, MFA, and the authoritative RLS security boundary. Core CRM tables are introduced through versioned migrations, seeded only with non-sensitive lookup data, and protected by tested helper functions and policies.

**Tech Stack:** Next.js, TypeScript, React, Supabase/PostgreSQL, Supabase Auth, `@supabase/ssr`, `@supabase/supabase-js`, Tailwind CSS, Zod, Vitest, Playwright, Supabase CLI/pgTAP, npm.

**Spec:** `2026-08-23-supporter-crm-v1-design.md`

## Global Constraints

- Next.js responsive web application.
- Supabase-hosted PostgreSQL and Supabase Auth.
- MFA for internal users.
- PostgreSQL Row-Level Security is the authoritative access-control layer.
- No public staff signup.
- Each staff account has one primary v1 role.
- Admin and State Organizer have statewide people access; only Admin receives administrative/export privileges.
- County Organizer access is limited to explicitly assigned counties.
- Volunteer/Staff access is limited to explicitly assigned contacts/work.
- Disabled staff accounts must lose protected access without deleting historical attribution.
- Public routes must never receive privileged/service-role credentials.
- Production supporter data must not be copied into local development or staging.
- All database changes live in versioned migrations in the repository.
- This plan does not implement public intake, imports/exports, reporting, Atlas integration, mass communications, or donation/event systems.

---

## File Structure

Create this initial project structure:

```text
LPNY-supporter-crm/
├── src/
│   ├── app/
│   │   ├── crm/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── login/
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   ├── mfa/
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── require-staff.ts
│   │   │   └── types.ts
│   │   ├── env.ts
│   │   └── supabase/
│   │       ├── browser.ts
│   │       ├── database.types.ts
│   │       └── server.ts
│   └── test/
│       └── setup.ts
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 202608230001_core_enums_and_staff.sql
│   │   ├── 202608230002_people_taxonomy_and_workflow.sql
│   │   └── 202608230003_rls_and_access_helpers.sql
│   ├── seed.sql
│   └── tests/
│       └── rls_access.test.sql
├── tests/
│   ├── auth/
│   │   └── require-staff.test.ts
│   └── e2e/
│       └── protected-crm.spec.ts
├── .env.example
├── package.json
├── playwright.config.ts
├── vitest.config.ts
└── README.md
```

---

### Task 1: Scaffold the application and test harness

**Files:**
- Create/modify: `package.json`
- Create: `.env.example`
- Create: `src/lib/env.ts`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `playwright.config.ts`
- Create/modify: `README.md`
- Create generated Next.js files under `src/app/`
- Create generated Supabase files under `supabase/`

**Interfaces:**
- Produces: `env` object exported from `src/lib/env.ts` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Produces: npm scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:watch`, `test:e2e`, `supabase:start`, `supabase:stop`, `supabase:reset`, and `test:db`.

- [ ] **Step 1: Scaffold Next.js in the repository root**

Run:

```bash
npm create next-app@latest . -- --typescript --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm
```

Expected: `src/app`, `package.json`, TypeScript, ESLint, Tailwind, and App Router files exist without overwriting the approved design/plan documents.

- [ ] **Step 2: Install application and test dependencies**

Run:

```bash
npm install @supabase/ssr @supabase/supabase-js zod
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test
```

Expected: all packages are recorded in `package.json` and `npm install` exits successfully.

- [ ] **Step 3: Initialize Supabase local development**

Run:

```bash
npx supabase init
```

Expected: `supabase/config.toml` exists.

- [ ] **Step 4: Add environment validation**

Create `.env.example`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-local-anon-key
```

Create `src/lib/env.ts`:

```ts
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});
```

- [ ] **Step 5: Add Vitest configuration**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 6: Add Playwright configuration**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
});
```

- [ ] **Step 7: Add package scripts**

Ensure `package.json` contains:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:reset": "supabase db reset",
    "test:db": "supabase test db"
  }
}
```

If the generated Next.js version does not expose `next lint`, replace only the `lint` script with the ESLint command generated/recommended by that Next.js release; do not change the remaining script names.

- [ ] **Step 8: Verify the scaffold**

Run:

```bash
npm run typecheck
npm run build
npm test
```

Expected: all three commands exit 0.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json .env.example src supabase vitest.config.ts playwright.config.ts README.md
 git commit -m "chore: scaffold CRM application foundation"
```

---

### Task 2: Create staff, county, and role foundations

**Files:**
- Create: `supabase/migrations/202608230001_core_enums_and_staff.sql`
- Modify: `supabase/seed.sql`

**Interfaces:**
- Produces enums: `public.staff_role`, `public.staff_status`.
- Produces tables: `public.counties`, `public.staff_users`, `public.staff_counties`.
- `staff_users.auth_user_id` references `auth.users(id)` and is unique.
- One staff user has exactly one `role` in v1.

- [ ] **Step 1: Write the first database test for staff constraints**

Create the initial `supabase/tests/rls_access.test.sql` with:

```sql
begin;
select plan(4);

select has_type('public', 'staff_role', 'staff_role enum exists');
select has_table('public', 'staff_users', 'staff_users exists');
select has_table('public', 'counties', 'counties exists');
select has_table('public', 'staff_counties', 'staff_counties exists');

select * from finish();
rollback;
```

- [ ] **Step 2: Run the database test and verify failure**

Run:

```bash
npm run supabase:start
npm run test:db
```

Expected: FAIL because the enum/tables do not exist.

- [ ] **Step 3: Create the migration**

Create `supabase/migrations/202608230001_core_enums_and_staff.sql`:

```sql
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
  display_name text not null,
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
```

- [ ] **Step 4: Seed the canonical New York county lookup**

Populate `supabase/seed.sql` with all 62 New York counties and their five-digit county FIPS values. The first rows must use this exact shape:

```sql
insert into public.counties (name, fips_code) values
  ('Albany', '36001'),
  ('Allegany', '36003'),
  ('Bronx', '36005'),
  ('Broome', '36007'),
  ('Cattaraugus', '36009')
on conflict (fips_code) do update set name = excluded.name;
```

Continue the same statement through all remaining New York counties in ascending FIPS order, ending with Yates (`36123`). Verify the final seed count is 62 with `select count(*) from public.counties;`.

- [ ] **Step 5: Reset local database and run tests**

Run:

```bash
npm run supabase:reset
npm run test:db
```

Expected: PASS and the local database contains 62 county rows.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/202608230001_core_enums_and_staff.sql supabase/seed.sql supabase/tests/rls_access.test.sql
 git commit -m "feat: add staff roles and county model"
```

---

### Task 3: Create the core people, taxonomy, activity, consent, and task schema

**Files:**
- Create: `supabase/migrations/202608230002_people_taxonomy_and_workflow.sql`
- Modify: `supabase/seed.sql`
- Modify: `supabase/tests/rls_access.test.sql`

**Interfaces:**
- Produces enums: `engagement_stage`, `task_priority`, `task_status`, `task_queue_scope`, `consent_channel`, `consent_state`, `duplicate_status`.
- Produces canonical `people` records and child tables used by later intake/organizer plans.
- Produces explicit `staff_person_assignments` for Volunteer/Staff access.

- [ ] **Step 1: Extend the schema-presence test and verify failure**

Add these assertions before `finish()` in `supabase/tests/rls_access.test.sql` and increase the plan count accordingly:

```sql
select has_table('public', 'people', 'people exists');
select has_table('public', 'person_relationships', 'person_relationships exists');
select has_table('public', 'person_interests', 'person_interests exists');
select has_table('public', 'person_sources', 'person_sources exists');
select has_table('public', 'activities', 'activities exists');
select has_table('public', 'internal_notes', 'internal_notes exists');
select has_table('public', 'tasks', 'tasks exists');
select has_table('public', 'consent_events', 'consent_events exists');
select has_table('public', 'staff_person_assignments', 'staff_person_assignments exists');
```

Run `npm run test:db` and expect FAIL.

- [ ] **Step 2: Create the workflow migration**

Create `supabase/migrations/202608230002_people_taxonomy_and_workflow.sql` with these exact enums and table contracts:

```sql
create type public.engagement_stage as enum (
  'new', 'follow_up_needed', 'contacted', 'engaged', 'inactive'
);
create type public.task_priority as enum ('low', 'normal', 'high');
create type public.task_status as enum ('open', 'completed', 'cancelled');
create type public.task_queue_scope as enum ('statewide', 'county');
create type public.consent_channel as enum ('email', 'sms', 'phone');
create type public.consent_state as enum ('opted_in', 'opted_out');
create type public.duplicate_status as enum ('open', 'merged', 'kept_separate');

create table public.people (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
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
create index people_county_id_idx on public.people(county_id);
create index people_assigned_staff_user_id_idx on public.people(assigned_staff_user_id);
create index people_engagement_stage_idx on public.people(engagement_stage);

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
  category text not null,
  name text not null,
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

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  activity_type text not null,
  actor_staff_user_id uuid references public.staff_users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index activities_person_occurred_idx on public.activities(person_id, occurred_at desc);

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
  task_type text not null,
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
create index tasks_assignee_status_idx on public.tasks(assignee_staff_user_id, status);
create index tasks_queue_idx on public.tasks(queue_scope, queue_county_id, status);

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

create table public.duplicate_candidates (
  id uuid primary key default gen_random_uuid(),
  person_a_id uuid not null references public.people(id) on delete cascade,
  person_b_id uuid not null references public.people(id) on delete cascade,
  reason text not null,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  status public.duplicate_status not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_staff_user_id uuid references public.staff_users(id) on delete set null,
  check (person_a_id <> person_b_id)
);
```

- [ ] **Step 3: Seed the approved taxonomies and website source**

Append to `supabase/seed.sql`:

```sql
insert into public.relationship_types (slug, name) values
  ('supporter', 'Supporter'),
  ('volunteer', 'Volunteer'),
  ('activist', 'Activist'),
  ('donor-prospect', 'Donor Prospect'),
  ('donor', 'Donor'),
  ('member', 'Member'),
  ('candidate-interest', 'Candidate Interest'),
  ('former-member', 'Former Member')
on conflict (slug) do update set name = excluded.name;

insert into public.interests (slug, name) values
  ('volunteering', 'Volunteering'),
  ('local-activism', 'Local activism'),
  ('campaign-work', 'Campaign work'),
  ('running-for-office', 'Running for office'),
  ('events', 'Events'),
  ('outreach', 'Outreach'),
  ('communications', 'Communications'),
  ('data-research', 'Data/research'),
  ('other', 'Other')
on conflict (slug) do update set name = excluded.name;

insert into public.sources (slug, category, name) values
  ('website-get-involved', 'website', 'Get Involved Form')
on conflict (slug) do update set name = excluded.name, category = excluded.category;
```

- [ ] **Step 4: Reset and verify schema tests pass**

Run:

```bash
npm run supabase:reset
npm run test:db
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/202608230002_people_taxonomy_and_workflow.sql supabase/seed.sql supabase/tests/rls_access.test.sql
 git commit -m "feat: add supporter workflow data model"
```

---

### Task 4: Implement RLS helper functions and policies

**Files:**
- Create: `supabase/migrations/202608230003_rls_and_access_helpers.sql`
- Modify: `supabase/tests/rls_access.test.sql`

**Interfaces:**
- Produces SQL helpers `private.current_staff_user_id()`, `private.current_staff_role()`, `private.is_active_staff()`, `private.can_access_county(uuid)`, and `private.can_access_person(uuid)`.
- Every protected person-child table uses `private.can_access_person(person_id)` as the access predicate.

- [ ] **Step 1: Add failing RLS behavior tests**

Extend `supabase/tests/rls_access.test.sql` with fixtures representing one Admin, one State Organizer, one Albany County Organizer, one Erie County Organizer, and one Volunteer/Staff user. Insert Albany and Erie people, assign the volunteer only to the Albany person, then assert these behaviors using `set local role authenticated` and a JWT `sub` claim for each fixture auth user:

```sql
select is(
  (select count(*) from public.people)::bigint,
  1::bigint,
  'Albany county organizer sees only Albany person'
);
```

Add equivalent assertions that:

```text
Admin -> 2 people
State Organizer -> 2 people
Albany County Organizer -> 1 Albany person
Erie County Organizer -> 1 Erie person
Volunteer/Staff assigned Albany person -> 1 person
Disabled staff user -> 0 people
```

Also assert the Volunteer/Staff user cannot insert a new `people` row and the County Organizer cannot select the other county's `activities` or `tasks` rows.

Run `npm run test:db` and expect FAIL before policies exist.

- [ ] **Step 2: Create access helper functions**

Create schema and functions in `supabase/migrations/202608230003_rls_and_access_helpers.sql`:

```sql
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_staff_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select su.id
  from public.staff_users su
  where su.auth_user_id = auth.uid()
    and su.status = 'active'
  limit 1
$$;

create or replace function private.current_staff_role()
returns public.staff_role
language sql
stable
security definer
set search_path = ''
as $$
  select su.role
  from public.staff_users su
  where su.auth_user_id = auth.uid()
    and su.status = 'active'
  limit 1
$$;

create or replace function private.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_staff_user_id() is not null
$$;

create or replace function private.can_access_county(target_county_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.current_staff_role() in ('admin', 'state_organizer') then true
    when private.current_staff_role() = 'county_organizer' then exists (
      select 1
      from public.staff_counties sc
      where sc.staff_user_id = private.current_staff_user_id()
        and sc.county_id = target_county_id
    )
    else false
  end
$$;

create or replace function private.can_access_person(target_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.current_staff_role() in ('admin', 'state_organizer') then true
    when private.current_staff_role() = 'county_organizer' then exists (
      select 1
      from public.people p
      where p.id = target_person_id
        and p.county_id is not null
        and private.can_access_county(p.county_id)
    )
    when private.current_staff_role() = 'volunteer_staff' then exists (
      select 1
      from public.staff_person_assignments spa
      where spa.staff_user_id = private.current_staff_user_id()
        and spa.person_id = target_person_id
    )
    else false
  end
$$;
```

- [ ] **Step 3: Enable RLS on protected tables**

In the same migration:

```sql
alter table public.people enable row level security;
alter table public.person_relationships enable row level security;
alter table public.person_interests enable row level security;
alter table public.person_tags enable row level security;
alter table public.person_sources enable row level security;
alter table public.activities enable row level security;
alter table public.internal_notes enable row level security;
alter table public.tasks enable row level security;
alter table public.consent_events enable row level security;
alter table public.staff_person_assignments enable row level security;
alter table public.duplicate_candidates enable row level security;
alter table public.staff_users enable row level security;
alter table public.staff_counties enable row level security;
alter table public.tags enable row level security;
alter table public.sources enable row level security;
alter table public.relationship_types enable row level security;
alter table public.interests enable row level security;
```

- [ ] **Step 4: Add people and child-table policies**

Add policies with these exact predicates:

```sql
create policy people_select on public.people
for select to authenticated
using (private.can_access_person(id));

create policy people_insert on public.people
for insert to authenticated
with check (private.current_staff_role() in ('admin', 'state_organizer', 'county_organizer'));

create policy people_update on public.people
for update to authenticated
using (private.can_access_person(id))
with check (private.can_access_person(id));
```

For each child table with `person_id` (`person_relationships`, `person_interests`, `person_tags`, `person_sources`, `activities`, `internal_notes`, `tasks`, `consent_events`), create `select`, `insert`, `update`, and `delete` policies that require `private.can_access_person(person_id)`. For `activities` and `consent_events`, omit update/delete policies so history is append-oriented. For `internal_notes`, allow update/delete only when the current user is the author or has Admin/State Organizer role.

For `duplicate_candidates`, allow select/update only to Admin/State Organizer when either linked person is accessible, and insert to Admin/State Organizer.

For `staff_person_assignments`, allow Admin/State Organizer to manage rows; allow the assigned Volunteer/Staff user to select only their own rows.

- [ ] **Step 5: Add lookup/staff policies**

Add authenticated read policies for `relationship_types` and `interests` where `active = true`. Add authenticated read policy for `sources` where `active = true`. Allow Admin/State Organizer to create/update `tags`; allow all active staff to read active tags.

For `staff_users`, allow active staff to select their own row; allow Admin to select/update all rows; allow State Organizer to select active staff rows for assignment UI but not update them.

For `staff_counties`, allow Admin to manage; allow the linked staff user and State Organizer to select.

- [ ] **Step 6: Reset and run RLS tests**

Run:

```bash
npm run supabase:reset
npm run test:db
```

Expected: all role-scope tests PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/202608230003_rls_and_access_helpers.sql supabase/tests/rls_access.test.sql
 git commit -m "feat: enforce CRM row level security"
```

---

### Task 5: Add typed Supabase clients and staff-session guard

**Files:**
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/supabase/server.ts`
- Create/generated: `src/lib/supabase/database.types.ts`
- Create: `src/lib/auth/types.ts`
- Create: `src/lib/auth/require-staff.ts`
- Create: `tests/auth/require-staff.test.ts`

**Interfaces:**
- `createBrowserSupabaseClient(): SupabaseClient<Database>`
- `createServerSupabaseClient(): Promise<SupabaseClient<Database>>`
- `requireStaffUser(): Promise<StaffContext>`
- `StaffContext = { staffUserId: string; authUserId: string; displayName: string; role: StaffRole; aal: string | null }`

- [ ] **Step 1: Generate database types**

With local Supabase running:

```bash
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

Expected: generated `Database` type includes `people`, `staff_users`, and the other migration-created tables.

- [ ] **Step 2: Create typed browser client**

Create `src/lib/supabase/browser.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
```

- [ ] **Step 3: Create typed server client**

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components can read cookies but cannot always write them.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 4: Write failing tests for the staff guard**

Create `tests/auth/require-staff.test.ts` covering three outcomes by mocking `createServerSupabaseClient()`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe("requireStaffUser", () => {
  it("rejects an unauthenticated session", async () => {
    // Mock getUser() -> user null and assert the guard redirects to /login.
  });

  it("rejects a disabled or missing staff profile", async () => {
    // Mock authenticated user and staff_users query -> no active row.
  });

  it("returns staff context for an active staff user", async () => {
    // Mock authenticated user, AAL2 session, and active staff_users row.
    // Assert role/displayName/staffUserId/authUserId are returned.
  });
});
```

Use Next.js `redirect` mocking so the first two tests assert the destination rather than throwing uninspected errors.

- [ ] **Step 5: Implement staff role/context types**

Create `src/lib/auth/types.ts`:

```ts
export type StaffRole =
  | "admin"
  | "state_organizer"
  | "county_organizer"
  | "volunteer_staff";

export interface StaffContext {
  staffUserId: string;
  authUserId: string;
  displayName: string;
  role: StaffRole;
  aal: string | null;
}
```

- [ ] **Step 6: Implement `requireStaffUser()`**

Create `src/lib/auth/require-staff.ts`:

```ts
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { StaffContext, StaffRole } from "./types";

export async function requireStaffUser(): Promise<StaffContext> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance?.currentLevel !== "aal2") redirect("/mfa");

  const { data: staff } = await supabase
    .from("staff_users")
    .select("id, display_name, role, status")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .single();

  if (!staff) redirect("/login?error=not-authorized");

  return {
    staffUserId: staff.id,
    authUserId: user.id,
    displayName: staff.display_name,
    role: staff.role as StaffRole,
    aal: assurance?.currentLevel ?? null,
  };
}
```

- [ ] **Step 7: Run unit tests and typecheck**

Run:

```bash
npm test -- tests/auth/require-staff.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib tests/auth/require-staff.test.ts
 git commit -m "feat: add typed Supabase staff session guard"
```

---

### Task 6: Build login, MFA enrollment/challenge, and the protected CRM shell

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/actions.ts`
- Create: `src/app/mfa/page.tsx`
- Create: `src/app/mfa/actions.ts`
- Create: `src/app/crm/layout.tsx`
- Create: `src/app/crm/page.tsx`
- Create: `tests/e2e/protected-crm.spec.ts`

**Interfaces:**
- `loginAction(formData: FormData): Promise<void>` authenticates email/password only for invited Supabase users.
- MFA page enrolls TOTP when no verified factor exists; otherwise challenges an existing TOTP factor.
- `/crm/*` calls `requireStaffUser()` on the server before rendering protected content.

- [ ] **Step 1: Write failing protected-route end-to-end test**

Create `tests/e2e/protected-crm.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("unauthenticated user is redirected from CRM to login", async ({ page }) => {
  await page.goto("/crm");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Staff sign in" })).toBeVisible();
});
```

Run `npm run test:e2e -- tests/e2e/protected-crm.spec.ts` and expect FAIL before routes exist.

- [ ] **Step 2: Implement login action**

Create `src/app/login/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) redirect("/login?error=invalid-input");

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/login?error=invalid-credentials");

  redirect("/crm");
}
```

- [ ] **Step 3: Implement login page without signup affordance**

Create `src/app/login/page.tsx` with a `Staff sign in` heading, email/password inputs, and a submit button bound to `loginAction`. Do not render a registration link or signup action. The page must explain only that staff accounts are invitation-only.

- [ ] **Step 4: Implement MFA actions**

Create `src/app/mfa/actions.ts` with server actions that call Supabase MFA APIs:

```ts
"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function verifyMfaAction(formData: FormData) {
  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!factorId || !/^\d{6}$/.test(code)) redirect("/mfa?error=invalid-code");

  const supabase = await createServerSupabaseClient();
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) redirect("/mfa?error=challenge-failed");

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (error) redirect("/mfa?error=verification-failed");

  redirect("/crm");
}
```

The enrollment branch on the MFA page must call `supabase.auth.mfa.enroll({ factorType: "totp" })` through a server action, display the returned QR/secret safely to the authenticated user, then use the same challenge/verify flow.

- [ ] **Step 5: Implement protected CRM layout**

Create `src/app/crm/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { requireStaffUser } from "@/lib/auth/require-staff";

export default async function CrmLayout({ children }: { children: ReactNode }) {
  const staff = await requireStaffUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <strong>LPNY Supporter CRM</strong>
          <span className="text-sm text-slate-600">{staff.displayName}</span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4">{children}</main>
    </div>
  );
}
```

Create `src/app/crm/page.tsx` as a minimal authenticated landing page with heading `CRM Dashboard` and copy that workflow modules arrive in the organizer-workflow plan. Do not build dashboard metrics in this task.

- [ ] **Step 6: Run tests**

Run:

```bash
npm test
npm run typecheck
npm run test:e2e -- tests/e2e/protected-crm.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/login src/app/mfa src/app/crm tests/e2e/protected-crm.spec.ts
 git commit -m "feat: protect CRM with invite-only MFA access"
```

---

### Task 7: Add CI and foundation documentation

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`

**Interfaces:**
- Produces a CI gate that runs install, lint, typecheck, unit tests, build, and database tests on pushes/PRs.
- Documents local setup without production credentials.

- [ ] **Step 1: Create CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  app:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: http://127.0.0.1:54321
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ci-placeholder-anon-key

  database:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase start
      - run: supabase db reset
      - run: supabase test db
```

- [ ] **Step 2: Update README with exact local workflow**

Document:

```text
1. npm install
2. npm run supabase:start
3. copy .env.example to .env.local and replace the anon key with `supabase status` output
4. npm run supabase:reset
5. npm run dev
6. npm test
7. npm run test:db
```

Also document that real supporter data and production service-role keys are prohibited in local/staging environments.

- [ ] **Step 3: Run the complete local verification suite**

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:db
```

Expected: every command exits 0.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml README.md
 git commit -m "ci: verify CRM foundation and database policies"
```

---

## Plan Self-Review

### Spec coverage provided by this plan

- Standalone Next.js/Supabase foundation: Tasks 1 and 7.
- Core people/relationship/interests/tags/sources/activity/tasks/consent/staff/county model: Tasks 2 and 3.
- Invite-only staff authentication surface: Tasks 5 and 6.
- MFA enforcement: Tasks 5 and 6.
- Admin/State/County/Volunteer role boundaries: Task 4.
- County-based and explicit-person RLS: Task 4.
- Disabled-account protection: Tasks 4 and 5.
- Versioned migrations and non-production local seed data: Tasks 2, 3, and 7.
- Real database-policy testing: Task 4.

### Deliberately deferred to later approved plans

- Public Get Involved intake and deduplication orchestration.
- ZIP-to-county routing and statewide fallback.
- Organizer dashboard, people directory, supporter profile, follow-up UX, Quick Add, and saved views.
- Admin invitation UI, duplicate merge UI, taxonomy/source management, audit log, CSV imports/exports.
- Reporting/source-performance analytics.
- Production deployment, backup/recovery verification, and full launch hardening.

No production supporter data is required to execute this plan.
