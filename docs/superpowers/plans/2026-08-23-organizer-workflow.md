# Organizer CRM Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the internal organizer-facing CRM workflow from action dashboard through searchable people, supporter profiles, follow-up actions, Quick Add, and private saved views.

**Architecture:** Keep PostgreSQL RLS as the authoritative scope boundary and query through the authenticated server Supabase client. Use focused server-side data modules for dashboard, people directory, and profiles; server actions/RPCs for state-changing workflows; append activities for meaningful history. Add only schema that the approved workflow requires, chiefly private saved views and transactional organizer actions.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, Supabase/PostgreSQL, Supabase Auth/RLS, Vitest, pgTAP, Playwright.

**Spec:** `2026-08-23-supporter-crm-v1-design.md`

## Global Constraints

- Responsive Next.js web application; phone usability is required for Quick Add and core follow-up work.
- Supabase/PostgreSQL RLS remains the access boundary; no service-role reads for organizer CRM screens.
- County organizers see assigned counties only; Volunteer/Staff see explicitly assigned contacts/work only; Admin/State Organizer receive statewide operational scope.
- Preserve history: stage changes, notes, task completion, reassignment, relationship/interest/tag changes, and contact outcomes produce activity records where specified.
- Contacts are archived rather than casually deleted; do-not-contact remains a restriction, not deletion.
- All database changes are versioned migrations and covered by pgTAP where authorization or transactional behavior changes.
- Use TDD: add the failing behavior test before each production behavior and keep Chromium/WebKit E2E coverage for critical user flows.

---

### Task 1: Organizer shell and action dashboard

**Files:**
- Modify: `src/app/crm/layout.tsx`
- Modify: `src/app/crm/page.tsx`
- Create: `src/lib/crm/dashboard.ts`
- Create: `src/lib/crm/dashboard-types.ts`
- Create: `tests/crm/dashboard.test.ts`

**Interfaces:**
- Produces: `loadDashboardData(now?: Date): Promise<DashboardData>` using the authenticated Supabase client and therefore inheriting RLS scope.
- Produces dashboard queues for new supporters, due today, overdue, recently contacted, unassigned contacts, recent activity, and basic scoped counts.

- [ ] Add failing dashboard classification/unit tests for due-today vs overdue boundaries and display normalization.
- [ ] Run the focused Vitest test and confirm the new behavior fails because dashboard helpers do not exist.
- [ ] Implement dashboard types/helpers and RLS-scoped reads using `createServerSupabaseClient()`.
- [ ] Replace the CRM placeholder with actionable metric cards and queue previews; add primary navigation for Dashboard, People, and Quick Add.
- [ ] Run lint, typecheck, focused tests, and production build.
- [ ] Commit as `feat: build organizer dashboard queues`.

### Task 2: People directory and combined filters

**Files:**
- Create: `src/app/crm/people/page.tsx`
- Create: `src/app/crm/people/people-filters.tsx`
- Create: `src/lib/crm/people-directory.ts`
- Create: `src/lib/crm/people-filters.ts`
- Create: `tests/crm/people-filters.test.ts`

**Interfaces:**
- Produces: typed `PeopleFilterState` parsed from URL search params.
- Produces: RLS-scoped people query supporting name/contact, county, ZIP, stage, relationship, interest, tag, organizer, source, joined date, last activity, open-task, candidate-interest, and member-status filters.

- [ ] Add failing parser/normalization tests for multiple simultaneous filters and invalid query values.
- [ ] Implement deterministic URL filter parsing/serialization.
- [ ] Build the RLS-scoped directory query with pagination and stable sort.
- [ ] Build searchable/filterable responsive directory UI with filter summary and clear-all behavior.
- [ ] Add tests for combined-filter semantics and run application verification.
- [ ] Commit as `feat: add people directory filters`.

### Task 3: Private saved views

**Files:**
- Create: `supabase/migrations/202608230006_saved_views.sql`
- Create: `supabase/tests/organizer_workflow_rls.test.sql`
- Create: `src/app/crm/people/saved-views.tsx`
- Create: `src/app/crm/people/actions.ts`

**Interfaces:**
- Produces table `saved_views(id, staff_user_id, name, filters, created_at, updated_at)` with owner-only RLS.
- Produces server actions to create, rename, apply, and delete the current staff user's private views.

- [ ] Add failing pgTAP assertions proving one staff user cannot read or mutate another user's saved views.
- [ ] Add migration and policies; rerun pgTAP until green.
- [ ] Add saved-view server actions with filter JSON validation.
- [ ] Add directory UI to save/apply/remove private views.
- [ ] Run complete application/database verification.
- [ ] Commit as `feat: add private saved people views`.

### Task 4: Supporter profile and history

**Files:**
- Create: `src/app/crm/people/[personId]/page.tsx`
- Create: `src/lib/crm/person-profile.ts`
- Create: `src/app/crm/people/[personId]/profile-sections.tsx`
- Create: `tests/crm/person-profile.test.ts`

**Interfaces:**
- Produces `loadPersonProfile(personId)` returning header identity/geography/stage/assignment plus relationships, interests, tags, activities, tasks, sources, consent history, and internal notes.
- Returns not-found when RLS hides or the record does not exist, without distinguishing those cases.

- [ ] Add failing profile mapping tests for chronological activity/task/source/consent presentation.
- [ ] Implement RLS-scoped profile reads.
- [ ] Build Overview, Activity, Tasks, Sources, Consent, and Internal Notes sections with mobile-safe layout.
- [ ] Link directory/dashboard people to the profile.
- [ ] Run lint/typecheck/unit/build and browser smoke tests.
- [ ] Commit as `feat: build supporter profiles`.

### Task 5: Follow-up actions and profile enrichment

**Files:**
- Create: `supabase/migrations/202608230007_organizer_actions.sql`
- Modify: `supabase/tests/organizer_workflow_rls.test.sql`
- Create: `src/app/crm/people/[personId]/actions.ts`
- Create: `src/app/crm/people/[personId]/follow-up-actions.tsx`

**Interfaces:**
- Produces transactional organizer RPCs/server actions for mark-contacted, create follow-up, change stage, add note, relationship/interest/tag changes, reassignment, unable-to-reach, do-not-contact, task completion, and authorized archive.
- Every relevant state change validates RLS/role authorization and appends the corresponding activity; do-not-contact/archive are audit-ready for the later administration plan.

- [ ] Add failing pgTAP behavior/authorization tests for allowed and denied mutations plus activity creation.
- [ ] Implement minimal transactional database functions and grants.
- [ ] Wire server actions with input validation and cache revalidation.
- [ ] Build concise profile action controls with do-not-contact safeguards.
- [ ] Run database/application/E2E verification.
- [ ] Commit as `feat: add organizer follow-up actions`.

### Task 6: Mobile Quick Add and duplicate warning

**Files:**
- Create: `src/app/crm/quick-add/page.tsx`
- Create: `src/app/crm/quick-add/quick-add-form.tsx`
- Create: `src/app/crm/quick-add/actions.ts`
- Create: `src/lib/crm/quick-add.ts`
- Create: `tests/crm/quick-add.test.ts`
- Create: `tests/e2e/quick-add.spec.ts`

**Interfaces:**
- Accepts minimum `first name + last name + (email or phone) + ZIP`.
- Searches RLS-visible likely matches before creation and presents a possible-existing-contact warning rather than silently duplicating.
- Creates an Organizer Entry source/activity and routes follow-up consistently with organizer-entered geography.

- [ ] Add failing validation and duplicate-warning tests.
- [ ] Implement normalized Quick Add validation and candidate lookup.
- [ ] Build phone-first form and warning/continue flow.
- [ ] Add safe create action and resulting profile redirect.
- [ ] Add Chromium/WebKit mobile-width E2E coverage and run full verification.
- [ ] Commit as `feat: add organizer quick add`.

### Task 7: Organizer workflow acceptance pass

**Files:**
- Modify: `tests/e2e/protected-crm.spec.ts`
- Create: `tests/e2e/organizer-workflow.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Validates the integrated operating loop: queued supporter → directory/profile → follow-up action → activity/task history, under role-appropriate data scope.

- [ ] Add end-to-end acceptance cases for dashboard navigation, combined directory filtering, profile display, follow-up completion, saved views, and Quick Add.
- [ ] Run `npm ci`, lint, typecheck, unit tests, production build, production dependency audit, Supabase reset/migrations, pgTAP, Chromium, and WebKit.
- [ ] Fix only verified regressions until the full suite is clean.
- [ ] Update README with organizer workflow routes and local verification commands.
- [ ] Commit as `test: verify organizer CRM workflow`.
