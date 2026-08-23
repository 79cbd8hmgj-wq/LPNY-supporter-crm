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
│   │   │   ├── mfa-enrollment.tsx
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── access.ts
│   │   │   ├── require-staff.ts
│   │   │   └── types.ts
│   │   ├── env.ts
│   │   └── supabase/
│   │       ├── browser.ts
│   │       ├── database.types.ts
│   │       └── server.ts
│   └── test/setup.ts
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 202608230001_core_enums_and_staff.sql
│   │   ├── 202608230002_people_taxonomy_and_workflow.sql
│   │   └── 202608230003_rls_and_access_helpers.sql
│   ├── seed.sql
│   └── tests/rls_access.test.sql
├── tests/
│   ├── auth/access.test.ts
│   └── e2e/protected-crm.spec.ts
├── .env.example
├── .github/workflows/ci.yml
├── package.json
├── playwright.config.ts
├── vitest.config.ts
└── README.md
```

---

### Task 1: Scaffold Next.js, Supabase, and test tooling

**Files:**
- Create/modify: `package.json`, `package-lock.json`, generated Next.js files under `src/`, `supabase/config.toml`
- Create: `.env.example`, `src/lib/env.ts`, `vitest.config.ts`, `src/test/setup.ts`, `playwright.config.ts`

**Interfaces:**
- Produces `env.NEXT_PUBLIC_SUPABASE_URL` and `env.NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Produces npm scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:watch`, `test:e2e`, `supabase:start`, `supabase:stop`, `supabase:reset`, `test:db`.

- [ ] **Step 1: Scaffold the application**

```bash
npm create next-app@latest . -- --typescript --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm
npm install @supabase/ssr @supabase/supabase-js zod
npm install -D supabase vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test
npx supabase init
```

Expected: the existing design/plan documents remain intact and the app scaffolds successfully.

- [ ] **Step 2: Disable public Supabase Auth signup locally**

In `supabase/config.toml`, set the Auth value to:

```toml
[auth]
enable_signup = false
```

Keep any other generated `[auth]` keys intact.

- [ ] **Step 3: Add environment validation**

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

- [ ] **Step 4: Configure Vitest**

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
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Configure Playwright**

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

- [ ] **Step 6: Normalize package scripts**

Set these scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "eslint .",
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

- [ ] **Step 7: Verify scaffold**

```bash
npm run lint
npm run typecheck
npm test
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=build-placeholder npm run build
```

Expected: every command exits 0.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src supabase .env.example vitest.config.ts playwright.config.ts
 git commit -m "chore: scaffold CRM application foundation"
```

---

### Task 2: Create staff roles and canonical New York counties

**Files:**
- Create: `supabase/migrations/202608230001_core_enums_and_staff.sql`
- Create/modify: `supabase/seed.sql`
- Create: `supabase/tests/rls_access.test.sql`

**Interfaces:**
- Produces `public.staff_role`, `public.staff_status`.
- Produces `public.counties`, `public.staff_users`, `public.staff_counties`.

- [ ] **Step 1: Write failing schema tests**

Create `supabase/tests/rls_access.test.sql`:

```sql
begin;
select plan(5);
select has_type('public', 'staff_role', 'staff_role enum exists');
select has_table('public', 'staff_users', 'staff_users exists');
select has_table('public', 'counties', 'counties exists');
select has_table('public', 'staff_counties', 'staff_counties exists');
select is((select count(*) from public.counties)::bigint, 62::bigint, 'all 62 NY counties are seeded');
select * from finish();
rollback;
```

Run:

```bash
npm run supabase:start
npm run test:db
```

Expected: FAIL because the migration does not exist yet.

- [ ] **Step 2: Create staff/county migration**

Create `supabase/migrations/202608230001_core_enums_and_staff.sql`:

```sql
create extension if not exists pgcrypto;
create extension if not exists pgtap with schema extensions;

create type public.staff_role as enum ('admin', 'state_organizer', 'county_organizer', 'volunteer_staff');
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
```

- [ ] **Step 3: Seed all 62 counties**

Set `supabase/seed.sql` to begin with:

```sql
insert into public.counties (name, fips_code) values
  ('Albany', '36001'),
  ('Allegany', '36003'),
  ('Bronx', '36005'),
  ('Broome', '36007'),
  ('Cattaraugus', '36009'),
  ('Cayuga', '36011'),
  ('Chautauqua', '36013'),
  ('Chemung', '36015'),
  ('Chenango', '36017'),
  ('Clinton', '36019'),
  ('Columbia', '36021'),
  ('Cortland', '36023'),
  ('Delaware', '36025'),
  ('Dutchess', '36027'),
  ('Erie', '36029'),
  ('Essex', '36031'),
  ('Franklin', '36033'),
  ('Fulton', '36035'),
  ('Genesee', '36037'),
  ('Greene', '36039'),
  ('Hamilton', '36041'),
  ('Herkimer', '36043'),
  ('Jefferson', '36045'),
  ('Kings', '36047'),
  ('Lewis', '36049'),
  ('Livingston', '36051'),
  ('Madison', '36053'),
  ('Monroe', '36055'),
  ('Montgomery', '36057'),
  ('Nassau', '36059'),
  ('New York', '36061'),
  ('Niagara', '36063'),
  ('Oneida', '36065'),
  ('Onondaga', '36067'),
  ('Ontario', '36069'),
  ('Orange', '36071'),
  ('Orleans', '36073'),
  ('Oswego', '36075'),
  ('Otsego', '36077'),
  ('Putnam', '36079'),
  ('Queens', '36081'),
  ('Rensselaer', '36083'),
  ('Richmond', '36085'),
  ('Rockland', '36087'),
  ('St. Lawrence', '36089'),
  ('Saratoga', '36091'),
  ('Schenectady', '36093'),
  ('Schoharie', '36095'),
  ('Schuyler', '36097'),
  ('Seneca', '36099'),
  ('Steuben', '36101'),
  ('Suffolk', '36103'),
  ('Sullivan', '36105'),
  ('Tioga', '36107'),
  ('Tompkins', '36109'),
  ('Ulster', '36111'),
  ('Warren', '36113'),
  ('Washington', '36115'),
  ('Wayne', '36117'),
  ('Westchester', '36119'),
  ('Wyoming', '36121'),
  ('Yates', '36123')
on conflict (fips_code) do update set name = excluded.name;
```

- [ ] **Step 4: Reset and verify**

```bash
npm run supabase:reset
npm run test:db
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/202608230001_core_enums_and_staff.sql supabase/seed.sql supabase/tests/rls_access.test.sql
 git commit -m "feat: add staff roles and county model"
```

---

### Task 3: Create the canonical people and workflow schema

**Files:**
- Create: `supabase/migrations/202608230002_people_taxonomy_and_workflow.sql`
- Modify: `supabase/seed.sql`
- Modify: `supabase/tests/rls_access.test.sql`

**Interfaces:**
- Produces `people`, taxonomy joins, sources, activities, notes, tasks, consent events, explicit staff/person assignments, and duplicate candidates.

- [ ] **Step 1: Extend schema tests and verify failure**

Change the pgTAP plan from 5 to 14 and add:

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

- [ ] **Step 2: Create workflow migration**

Create `supabase/migrations/202608230002_people_taxonomy_and_workflow.sql`:

```sql
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
create unique index people_normalized_email_unique_idx on public.people(normalized_email)
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

- [ ] **Step 3: Seed approved relationship, interest, and source values**

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

- [ ] **Step 4: Reset and verify**

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

### Task 4: Enforce role, county, and explicit-person RLS

**Files:**
- Create: `supabase/migrations/202608230003_rls_and_access_helpers.sql`
- Replace/extend: `supabase/tests/rls_access.test.sql`

**Interfaces:**
- Produces `private.current_staff_user_id()`, `private.current_staff_role()`, `private.is_active_staff()`, `private.can_access_county(uuid)`, `private.can_access_person(uuid)`.
- `people` is readable by Admin/State statewide, County Organizer within assigned counties, and Volunteer/Staff only through explicit assignment.
- Volunteer/Staff cannot insert/update canonical `people` rows in this foundation plan; they can work through authorized child records such as tasks/notes when assigned.

- [ ] **Step 1: Add access helper migration**

Create the start of `supabase/migrations/202608230003_rls_and_access_helpers.sql`:

```sql
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_staff_user_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select su.id from public.staff_users su
  where su.auth_user_id = auth.uid() and su.status = 'active'
  limit 1
$$;

create or replace function private.current_staff_role()
returns public.staff_role language sql stable security definer set search_path = '' as $$
  select su.role from public.staff_users su
  where su.auth_user_id = auth.uid() and su.status = 'active'
  limit 1
$$;

create or replace function private.is_active_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.current_staff_user_id() is not null
$$;

create or replace function private.can_access_county(target_county_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when private.current_staff_role() in ('admin', 'state_organizer') then true
    when private.current_staff_role() = 'county_organizer' then exists (
      select 1 from public.staff_counties sc
      where sc.staff_user_id = private.current_staff_user_id()
        and sc.county_id = target_county_id
    )
    else false
  end
$$;

create or replace function private.can_access_person(target_person_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when private.current_staff_role() in ('admin', 'state_organizer') then true
    when private.current_staff_role() = 'county_organizer' then exists (
      select 1 from public.people p
      where p.id = target_person_id
        and p.county_id is not null
        and private.can_access_county(p.county_id)
    )
    when private.current_staff_role() = 'volunteer_staff' then exists (
      select 1 from public.staff_person_assignments spa
      where spa.staff_user_id = private.current_staff_user_id()
        and spa.person_id = target_person_id
    )
    else false
  end
$$;
```

- [ ] **Step 2: Enable RLS and add people policies**

Append:

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

create policy people_select on public.people for select to authenticated
using (private.can_access_person(id));

create policy people_insert on public.people for insert to authenticated
with check (
  private.current_staff_role() in ('admin', 'state_organizer')
  or (
    private.current_staff_role() = 'county_organizer'
    and county_id is not null
    and private.can_access_county(county_id)
  )
);

create policy people_update on public.people for update to authenticated
using (private.can_access_person(id))
with check (
  private.current_staff_role() in ('admin', 'state_organizer')
  or (
    private.current_staff_role() = 'county_organizer'
    and county_id is not null
    and private.can_access_county(county_id)
  )
);
```

- [ ] **Step 3: Add child-record policies**

Append:

```sql
create policy person_relationships_select on public.person_relationships for select to authenticated using (private.can_access_person(person_id));
create policy person_relationships_insert on public.person_relationships for insert to authenticated with check (private.can_access_person(person_id));
create policy person_relationships_delete on public.person_relationships for delete to authenticated using (private.can_access_person(person_id));

create policy person_interests_select on public.person_interests for select to authenticated using (private.can_access_person(person_id));
create policy person_interests_insert on public.person_interests for insert to authenticated with check (private.can_access_person(person_id));
create policy person_interests_delete on public.person_interests for delete to authenticated using (private.can_access_person(person_id));

create policy person_tags_select on public.person_tags for select to authenticated using (private.can_access_person(person_id));
create policy person_tags_insert on public.person_tags for insert to authenticated with check (private.can_access_person(person_id));
create policy person_tags_delete on public.person_tags for delete to authenticated using (private.can_access_person(person_id));

create policy person_sources_select on public.person_sources for select to authenticated using (private.can_access_person(person_id));
create policy person_sources_insert on public.person_sources for insert to authenticated with check (private.can_access_person(person_id));

create policy activities_select on public.activities for select to authenticated using (private.can_access_person(person_id));
create policy activities_insert on public.activities for insert to authenticated with check (private.can_access_person(person_id));

create policy consent_events_select on public.consent_events for select to authenticated using (private.can_access_person(person_id));
create policy consent_events_insert on public.consent_events for insert to authenticated with check (private.can_access_person(person_id));

create policy tasks_select on public.tasks for select to authenticated using (private.can_access_person(person_id));
create policy tasks_insert on public.tasks for insert to authenticated with check (private.can_access_person(person_id));
create policy tasks_update on public.tasks for update to authenticated using (private.can_access_person(person_id)) with check (private.can_access_person(person_id));
create policy tasks_delete on public.tasks for delete to authenticated using (private.can_access_person(person_id));

create policy internal_notes_select on public.internal_notes for select to authenticated using (private.can_access_person(person_id));
create policy internal_notes_insert on public.internal_notes for insert to authenticated with check (
  private.can_access_person(person_id) and author_staff_user_id = private.current_staff_user_id()
);
create policy internal_notes_update on public.internal_notes for update to authenticated using (
  private.can_access_person(person_id)
  and (author_staff_user_id = private.current_staff_user_id() or private.current_staff_role() in ('admin', 'state_organizer'))
) with check (private.can_access_person(person_id));
create policy internal_notes_delete on public.internal_notes for delete to authenticated using (
  private.can_access_person(person_id)
  and (author_staff_user_id = private.current_staff_user_id() or private.current_staff_role() in ('admin', 'state_organizer'))
);
```

- [ ] **Step 4: Add staff, lookup, and duplicate-review policies**

Append:

```sql
create policy relationship_types_read on public.relationship_types for select to authenticated using (private.is_active_staff() and active);
create policy interests_read on public.interests for select to authenticated using (private.is_active_staff() and active);
create policy sources_read on public.sources for select to authenticated using (private.is_active_staff() and active);
create policy tags_read on public.tags for select to authenticated using (private.is_active_staff() and active);
create policy tags_insert on public.tags for insert to authenticated with check (private.current_staff_role() in ('admin', 'state_organizer'));
create policy tags_update on public.tags for update to authenticated using (private.current_staff_role() in ('admin', 'state_organizer')) with check (private.current_staff_role() in ('admin', 'state_organizer'));

create policy staff_users_self_read on public.staff_users for select to authenticated using (id = private.current_staff_user_id());
create policy staff_users_admin_read on public.staff_users for select to authenticated using (private.current_staff_role() = 'admin');
create policy staff_users_state_read on public.staff_users for select to authenticated using (private.current_staff_role() = 'state_organizer' and status = 'active');
create policy staff_users_admin_update on public.staff_users for update to authenticated using (private.current_staff_role() = 'admin') with check (private.current_staff_role() = 'admin');

create policy staff_counties_read on public.staff_counties for select to authenticated using (
  staff_user_id = private.current_staff_user_id() or private.current_staff_role() in ('admin', 'state_organizer')
);
create policy staff_counties_admin_insert on public.staff_counties for insert to authenticated with check (private.current_staff_role() = 'admin');
create policy staff_counties_admin_delete on public.staff_counties for delete to authenticated using (private.current_staff_role() = 'admin');

create policy staff_person_assignments_self_read on public.staff_person_assignments for select to authenticated using (
  staff_user_id = private.current_staff_user_id() or private.current_staff_role() in ('admin', 'state_organizer')
);
create policy staff_person_assignments_manage on public.staff_person_assignments for all to authenticated using (
  private.current_staff_role() in ('admin', 'state_organizer')
) with check (private.current_staff_role() in ('admin', 'state_organizer'));

create policy duplicate_candidates_read on public.duplicate_candidates for select to authenticated using (
  private.current_staff_role() in ('admin', 'state_organizer')
);
create policy duplicate_candidates_insert on public.duplicate_candidates for insert to authenticated with check (
  private.current_staff_role() in ('admin', 'state_organizer')
);
create policy duplicate_candidates_update on public.duplicate_candidates for update to authenticated using (
  private.current_staff_role() in ('admin', 'state_organizer')
) with check (private.current_staff_role() in ('admin', 'state_organizer'));
```

- [ ] **Step 5: Replace database test with role fixtures and access assertions**

After the schema-presence assertions in `supabase/tests/rls_access.test.sql`, create fixed fixtures:

```sql
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000101','authenticated','authenticated','admin@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000102','authenticated','authenticated','state@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000103','authenticated','authenticated','albany@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000104','authenticated','authenticated','erie@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000105','authenticated','authenticated','volunteer@test.local','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-000000000106','authenticated','authenticated','disabled@test.local','',now(),'{}','{}',now(),now());

insert into public.staff_users (id, auth_user_id, display_name, role, status) values
('10000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000101','Admin','admin','active'),
('10000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000102','State','state_organizer','active'),
('10000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000103','Albany Organizer','county_organizer','active'),
('10000000-0000-0000-0000-000000000104','00000000-0000-0000-0000-000000000104','Erie Organizer','county_organizer','active'),
('10000000-0000-0000-0000-000000000105','00000000-0000-0000-0000-000000000105','Volunteer','volunteer_staff','active'),
('10000000-0000-0000-0000-000000000106','00000000-0000-0000-0000-000000000106','Disabled','state_organizer','disabled');

insert into public.staff_counties (staff_user_id, county_id)
select '10000000-0000-0000-0000-000000000103', id from public.counties where name='Albany';
insert into public.staff_counties (staff_user_id, county_id)
select '10000000-0000-0000-0000-000000000104', id from public.counties where name='Erie';

insert into public.people (id, first_name, last_name, normalized_email, county_id) values
('20000000-0000-0000-0000-000000000201','Alice','Albany','alice@test.local',(select id from public.counties where name='Albany')),
('20000000-0000-0000-0000-000000000202','Evan','Erie','evan@test.local',(select id from public.counties where name='Erie'));

insert into public.staff_person_assignments (staff_user_id, person_id) values
('10000000-0000-0000-0000-000000000105','20000000-0000-0000-0000-000000000201');
```

For each user, set the JWT claims and authenticated role, run the count assertion, then reset role. Use this exact pattern for Admin:

```sql
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.people)::bigint, 2::bigint, 'Admin sees statewide people');
reset role;
```

Repeat with these expected results:

```text
00000000-0000-0000-0000-000000000102 -> 2 (State Organizer)
00000000-0000-0000-0000-000000000103 -> 1 and visible first_name = Alice (Albany County Organizer)
00000000-0000-0000-0000-000000000104 -> 1 and visible first_name = Evan (Erie County Organizer)
00000000-0000-0000-0000-000000000105 -> 1 and visible first_name = Alice (Volunteer/Staff explicit assignment)
00000000-0000-0000-0000-000000000106 -> 0 (disabled account)
```

Add an `throws_ok` assertion proving the Albany County Organizer cannot insert a person whose `county_id` is Erie, and an `throws_ok` assertion proving Volunteer/Staff cannot insert into `people`.

Update the pgTAP plan count to equal the final number of assertions in the file.

- [ ] **Step 6: Reset and run database tests**

```bash
npm run supabase:reset
npm run test:db
```

Expected: all schema and RLS assertions PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/202608230003_rls_and_access_helpers.sql supabase/tests/rls_access.test.sql
 git commit -m "feat: enforce CRM row level security"
```

---

### Task 5: Add typed Supabase clients and deterministic staff-access logic

**Files:**
- Create/generated: `src/lib/supabase/database.types.ts`
- Create: `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`
- Create: `src/lib/auth/types.ts`, `src/lib/auth/access.ts`, `src/lib/auth/require-staff.ts`
- Create: `tests/auth/access.test.ts`

**Interfaces:**
- `createBrowserSupabaseClient()` and `createServerSupabaseClient()` return clients typed with `Database`.
- `evaluateStaffAccess(input: StaffAccessInput): StaffAccessDecision` is pure and unit-tested.
- `requireStaffUser(): Promise<StaffContext>` performs Supabase reads, applies the decision, and redirects when necessary.

- [ ] **Step 1: Generate database types**

```bash
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

- [ ] **Step 2: Create Supabase clients**

Create `src/lib/supabase/browser.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
```

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Cookie writes are unavailable from some Server Component render paths.
        }
      },
    },
  });
}
```

- [ ] **Step 3: Define access types**

Create `src/lib/auth/types.ts`:

```ts
export type StaffRole = "admin" | "state_organizer" | "county_organizer" | "volunteer_staff";

export interface StaffRecord {
  id: string;
  display_name: string;
  role: StaffRole;
  status: "active" | "disabled";
}

export interface StaffContext {
  staffUserId: string;
  authUserId: string;
  displayName: string;
  role: StaffRole;
  aal: "aal1" | "aal2" | null;
}
```

Create `src/lib/auth/access.ts`:

```ts
import type { StaffContext, StaffRecord } from "./types";

export interface StaffAccessInput {
  authUserId: string | null;
  currentAal: "aal1" | "aal2" | null;
  staff: StaffRecord | null;
}

export type StaffAccessDecision =
  | { kind: "allow"; context: StaffContext }
  | { kind: "redirect"; to: "/login" | "/mfa" | "/login?error=not-authorized" };

export function evaluateStaffAccess(input: StaffAccessInput): StaffAccessDecision {
  if (!input.authUserId) return { kind: "redirect", to: "/login" };
  if (input.currentAal !== "aal2") return { kind: "redirect", to: "/mfa" };
  if (!input.staff || input.staff.status !== "active") {
    return { kind: "redirect", to: "/login?error=not-authorized" };
  }
  return {
    kind: "allow",
    context: {
      staffUserId: input.staff.id,
      authUserId: input.authUserId,
      displayName: input.staff.display_name,
      role: input.staff.role,
      aal: input.currentAal,
    },
  };
}
```

- [ ] **Step 4: Write access tests before wiring the guard**

Create `tests/auth/access.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { evaluateStaffAccess } from "@/lib/auth/access";

const activeStaff = {
  id: "staff-1",
  display_name: "Test Organizer",
  role: "county_organizer" as const,
  status: "active" as const,
};

describe("evaluateStaffAccess", () => {
  it("sends unauthenticated users to login", () => {
    expect(evaluateStaffAccess({ authUserId: null, currentAal: null, staff: null })).toEqual({ kind: "redirect", to: "/login" });
  });

  it("requires aal2 before CRM access", () => {
    expect(evaluateStaffAccess({ authUserId: "auth-1", currentAal: "aal1", staff: activeStaff })).toEqual({ kind: "redirect", to: "/mfa" });
  });

  it("rejects missing staff authorization", () => {
    expect(evaluateStaffAccess({ authUserId: "auth-1", currentAal: "aal2", staff: null })).toEqual({ kind: "redirect", to: "/login?error=not-authorized" });
  });

  it("returns staff context for active aal2 staff", () => {
    expect(evaluateStaffAccess({ authUserId: "auth-1", currentAal: "aal2", staff: activeStaff })).toEqual({
      kind: "allow",
      context: {
        staffUserId: "staff-1",
        authUserId: "auth-1",
        displayName: "Test Organizer",
        role: "county_organizer",
        aal: "aal2",
      },
    });
  });
});
```

Run `npm test -- tests/auth/access.test.ts`; expected PASS after `access.ts` exists.

- [ ] **Step 5: Implement the server guard**

Create `src/lib/auth/require-staff.ts`:

```ts
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { evaluateStaffAccess } from "./access";
import type { StaffContext, StaffRecord } from "./types";

export async function requireStaffUser(): Promise<StaffContext> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  let staff: StaffRecord | null = null;
  if (user) {
    const result = await supabase
      .from("staff_users")
      .select("id, display_name, role, status")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    staff = result.data as StaffRecord | null;
  }

  const decision = evaluateStaffAccess({
    authUserId: user?.id ?? null,
    currentAal: assurance?.currentLevel ?? null,
    staff,
  });

  if (decision.kind === "redirect") redirect(decision.to);
  return decision.context;
}
```

- [ ] **Step 6: Verify**

```bash
npm test -- tests/auth/access.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib tests/auth/access.test.ts
 git commit -m "feat: add typed Supabase staff access guard"
```

---

### Task 6: Build invite-only login, TOTP MFA, and protected CRM shell

**Files:**
- Create: `src/app/login/actions.ts`, `src/app/login/page.tsx`
- Create: `src/app/mfa/actions.ts`, `src/app/mfa/mfa-enrollment.tsx`, `src/app/mfa/page.tsx`
- Create: `src/app/crm/layout.tsx`, `src/app/crm/page.tsx`
- Create: `tests/e2e/protected-crm.spec.ts`

**Interfaces:**
- `loginAction(formData)` calls `signInWithPassword`; there is no signup action.
- `startMfaEnrollmentAction(previousState, formData)` returns TOTP factor data.
- `verifyMfaAction(formData)` challenges/verifies TOTP and redirects to `/crm`.
- `/crm/*` requires `requireStaffUser()`.

- [ ] **Step 1: Write unauthenticated E2E test**

Create `tests/e2e/protected-crm.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("unauthenticated user is redirected from CRM to login", async ({ page }) => {
  await page.goto("/crm");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Staff sign in" })).toBeVisible();
});
```

Run it and expect FAIL before routes exist.

- [ ] **Step 2: Implement login action and page**

Create `src/app/login/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function loginAction(formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) redirect("/login?error=invalid-input");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/login?error=invalid-credentials");
  redirect("/crm");
}
```

Create `src/app/login/page.tsx`:

```tsx
import { loginAction } from "./actions";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="text-2xl font-semibold">Staff sign in</h1>
      <p className="mt-2 text-sm text-slate-600">Staff accounts are invitation-only.</p>
      <form action={loginAction} className="mt-6 space-y-4">
        <label className="block">Email<input className="mt-1 w-full border p-2" name="email" type="email" required /></label>
        <label className="block">Password<input className="mt-1 w-full border p-2" name="password" type="password" required /></label>
        <button className="w-full bg-slate-900 p-2 text-white" type="submit">Sign in</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Implement MFA server actions**

Create `src/app/mfa/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface EnrollmentState {
  factorId: string;
  qrCode: string;
  secret: string;
  error: string | null;
}

export async function startMfaEnrollmentAction(_previous: EnrollmentState | null, _formData: FormData): Promise<EnrollmentState> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) return { factorId: "", qrCode: "", secret: "", error: "Could not start MFA enrollment." };
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret, error: null };
}

export async function verifyMfaAction(formData: FormData) {
  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!factorId || !/^\d{6}$/.test(code)) redirect("/mfa?error=invalid-code");

  const supabase = await createServerSupabaseClient();
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) redirect("/mfa?error=challenge-failed");
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
  if (error) redirect("/mfa?error=verification-failed");
  redirect("/crm");
}
```

- [ ] **Step 4: Implement MFA enrollment/challenge UI**

Create `src/app/mfa/mfa-enrollment.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { startMfaEnrollmentAction, verifyMfaAction, type EnrollmentState } from "./actions";

export function MfaEnrollment() {
  const [state, action, pending] = useActionState<EnrollmentState | null, FormData>(startMfaEnrollmentAction, null);

  if (!state) {
    return <form action={action}><button disabled={pending} type="submit">Set up authenticator</button></form>;
  }
  if (state.error) return <p role="alert">{state.error}</p>;

  return (
    <div className="space-y-4">
      <img alt="Authenticator QR code" src={state.qrCode} />
      <p className="break-all text-sm">Manual key: {state.secret}</p>
      <form action={verifyMfaAction} className="space-y-2">
        <input name="factorId" type="hidden" value={state.factorId} />
        <label className="block">6-digit code<input name="code" inputMode="numeric" pattern="[0-9]{6}" required /></label>
        <button type="submit">Verify and continue</button>
      </form>
    </div>
  );
}
```

Create `src/app/mfa/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { verifyMfaAction } from "./actions";
import { MfaEnrollment } from "./mfa-enrollment";

export default async function MfaPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.auth.mfa.listFactors();
  const verified = data?.totp.find((factor) => factor.status === "verified");

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">Multi-factor authentication</h1>
      {verified ? (
        <form action={verifyMfaAction} className="mt-6 space-y-3">
          <input name="factorId" type="hidden" value={verified.id} />
          <label className="block">6-digit code<input name="code" inputMode="numeric" pattern="[0-9]{6}" required /></label>
          <button type="submit">Verify</button>
        </form>
      ) : <div className="mt-6"><MfaEnrollment /></div>}
    </main>
  );
}
```

- [ ] **Step 5: Implement protected CRM shell**

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

Create `src/app/crm/page.tsx`:

```tsx
export default function CrmHomePage() {
  return <h1 className="text-2xl font-semibold">CRM Dashboard</h1>;
}
```

- [ ] **Step 6: Verify auth shell**

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
- CI runs lint, typecheck, unit tests, build, database reset, and pgTAP tests.

- [ ] **Step 1: Create CI**

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]

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
          NEXT_PUBLIC_SUPABASE_ANON_KEY: build-placeholder

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

- [ ] **Step 2: Document exact local workflow**

Add this setup sequence to `README.md`:

```text
1. npm install
2. npm run supabase:start
3. cp .env.example .env.local
4. replace NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local with the anon key printed by `supabase status`
5. npm run supabase:reset
6. npm run dev
7. npm run lint
8. npm run typecheck
9. npm test
10. npm run test:db
```

Also state explicitly: production supporter records, production database dumps, production access tokens, and production service-role keys must not be used in local or staging environments.

- [ ] **Step 3: Run complete verification**

```bash
npm run lint
npm run typecheck
npm test
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=build-placeholder npm run build
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

### Spec coverage in this plan

- Standalone Next.js/Supabase foundation: Tasks 1 and 7.
- Core people/relationship/interests/tags/sources/activity/tasks/consent/staff/county model: Tasks 2 and 3.
- Invite-only staff authentication surface: Task 6.
- MFA enforcement: Tasks 5 and 6.
- Admin/State/County/Volunteer role boundaries: Task 4.
- County and explicit-person database boundaries: Task 4.
- Disabled-account protection: Tasks 4 and 5.
- Versioned migrations and non-production seed data: Tasks 2, 3, and 7.
- Real database-policy testing: Task 4.

### Deferred to later roadmap plans

- Public Get Involved intake, normalization, deduplication, ZIP routing, source handling, rate limiting, bot protection, and initial task creation.
- Organizer dashboard, directory, supporter profile, follow-up actions, Quick Add, and saved views.
- Admin invitation UI, duplicate merges, taxonomy/source administration, audit log, CSV imports/exports.
- Reporting/source-performance analytics.
- Staging/production deployment, backup/recovery validation, and full production launch hardening.

No production supporter data is required to execute this plan.
