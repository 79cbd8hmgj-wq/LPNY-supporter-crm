# Administration and Data Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 administration and data-operations subsystem for staff access management, taxonomy administration, duplicate review/merge, guided CSV import, Admin-only filtered CSV export, and append-oriented auditing of sensitive actions.

**Architecture:** Extend the existing Supabase schema and RLS model rather than bypassing it. Routine admin/state-organizer reads and database mutations use the authenticated server client; service-role access is restricted to server-only Supabase Auth invitation work. Sensitive multi-table changes are transactional PostgreSQL RPCs that write append-only audit events, while CSV import/export reuse the existing people normalization/filtering rules and never expose privileged credentials to the browser.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, Supabase/PostgreSQL, Supabase Auth/RLS, Zod, Vitest, pgTAP, Playwright.

**Spec:** `docs/superpowers/plans/2026-08-23-supporter-crm-v1-roadmap.md` — Phase 4, plus the approved destructive-action rule that contacts are archived, duplicate records are merged while preserving history, and important changes appear in the audit trail.

## Global Constraints

- PostgreSQL RLS remains the authoritative supporter-data access boundary.
- Service-role credentials remain server-only and are used only for Supabase Auth administrative operations that cannot be performed by the authenticated client.
- Staff invitations, staff disablement/reactivation, role changes, county assignments, CSV import, CSV export, and audit-log viewing are Admin-only.
- Duplicate review/merge and source/tag/interest administration are available to Admin and State Organizer roles, matching the existing statewide operational boundary.
- No sensitive action may rely only on hidden UI controls; server/database authorization must reject disallowed callers.
- Sensitive state changes append an audit event. Audit events are immutable through application roles: no update/delete policies or grants.
- Duplicate merges preserve institutional history by re-parenting history/assignment rows to the selected canonical person and archiving the merged-away person instead of deleting it.
- Taxonomy records are deactivated rather than deleted when they may already be referenced.
- CSV imports never silently create a second person when an exact normalized email already exists. Ambiguous phone/last-name matches require an explicit row decision or are skipped.
- Admin CSV exports reuse the existing People filter semantics and do not include internal-note bodies by default.
- Production PII is never used as automated test data.
- All database changes are versioned migrations and authorization/transaction changes receive pgTAP coverage.
- Use TDD for each task and keep Chromium/WebKit acceptance coverage for critical administration flows.

---

### Task 1: Administration access shell and append-only audit foundation

**Files:**
- Create: `supabase/migrations/202608310010_admin_audit.sql`
- Create: `supabase/tests/admin_data_operations.test.sql`
- Create: `src/lib/auth/require-role.ts`
- Create: `tests/auth/require-role.test.ts`
- Create: `src/app/crm/admin/page.tsx`
- Modify: `src/app/crm/layout.tsx`
- Modify: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Produces `requireStaffRole(allowedRoles: readonly StaffRole[]): Promise<StaffContext>`; it delegates authentication/MFA validation to `requireStaffUser()` and redirects authorized-but-disallowed staff to `/crm`.
- Produces `public.admin_audit_events(id uuid, actor_staff_user_id uuid, action_type text, target_type text, target_id uuid null, metadata jsonb, occurred_at timestamptz)`.
- Produces private helper `private.append_admin_audit(action_type text, target_type text, target_id uuid, metadata jsonb)`; it derives the actor from `private.current_staff_user_id()` and is not granted directly to application roles.
- `/crm/admin` is available to Admin and State Organizer. It displays role-appropriate links; Admin-only cards are not rendered for State Organizer.

- [ ] Add failing Vitest coverage for `requireStaffRole` decision logic by extracting a pure `isRoleAllowed(currentRole, allowedRoles)` helper and testing Admin/State/County/Volunteer cases.
- [ ] Add failing pgTAP assertions that Admin can read audit events, State/County/Volunteer cannot read them, authenticated roles cannot directly insert/update/delete them, and the private append helper is not directly executable by `authenticated`.
- [ ] Add the audit table, immutable RLS/grants, supporting index on `(occurred_at desc)`, and private append helper.
- [ ] Add the role guard and `/crm/admin` landing page. Modify CRM navigation so Admin and State Organizer receive an `Administration` link while County Organizer/Volunteer do not.
- [ ] Regenerate/update `Database` types for the new audit table.
- [ ] Run `npm run test -- tests/auth/require-role.test.ts`, `npm run lint`, `npm run typecheck`, `npm run build`, `supabase db reset`, and `supabase test db`.
- [ ] Commit as `feat: add administration access and audit foundation`.

### Task 2: Admin-only staff invitations and access management

**Files:**
- Create: `supabase/migrations/202608310011_staff_administration.sql`
- Modify: `supabase/tests/admin_data_operations.test.sql`
- Create: `src/lib/admin/staff.ts`
- Create: `tests/admin/staff.test.ts`
- Create: `src/app/crm/admin/staff/page.tsx`
- Create: `src/app/crm/admin/staff/actions.ts`
- Create: `src/app/crm/admin/staff/staff-management.tsx`
- Modify: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Produces Zod-backed `StaffInviteInput` with `email`, `displayName`, `role`, and `countyIds`.
- Produces `inviteStaffMember(input)` server action. It calls `requireStaffRole(["admin"])`, uses `createAdminSupabaseClient().auth.admin.inviteUserByEmail()` only on the server, then calls authenticated RPC `admin_register_staff_user`. If database registration fails after Auth invitation succeeds, it removes the just-created Auth user before returning an error.
- Produces `public.admin_register_staff_user(p_auth_user_id uuid, p_display_name text, p_role staff_role, p_county_ids uuid[])` and `public.admin_update_staff_access(p_staff_user_id uuid, p_role staff_role, p_status staff_status, p_county_ids uuid[])`; both require current Admin, validate county-role combinations, update staff/county rows transactionally, and append audit events.
- County Organizer must have at least one county; Admin/State Organizer/Volunteer-Staff store no county assignments through this screen.

- [ ] Add failing unit tests for invite/update validation, including normalized email, blank display name, County Organizer without counties, and non-county roles receiving counties.
- [ ] Add failing pgTAP tests proving only Admin can register/update staff access and verifying audit rows for invite-registration, role change, status change, and county-assignment change.
- [ ] Implement the two transactional staff-admin RPCs and grants.
- [ ] Implement staff list loading via authenticated RLS, invite action with server-only Auth admin client and rollback cleanup, and access-update action.
- [ ] Build responsive staff management UI with invitation form, role selector, county multi-select for County Organizers, active/disabled status control, and explicit confirmation before disabling a staff account.
- [ ] Run focused unit/db tests plus lint/typecheck/build.
- [ ] Commit as `feat: add staff administration`.

### Task 3: Source, tag, and interest administration

**Files:**
- Create: `supabase/migrations/202608310012_taxonomy_administration.sql`
- Modify: `supabase/tests/admin_data_operations.test.sql`
- Create: `src/lib/admin/taxonomies.ts`
- Create: `tests/admin/taxonomies.test.ts`
- Create: `src/app/crm/admin/taxonomies/page.tsx`
- Create: `src/app/crm/admin/taxonomies/actions.ts`
- Create: `src/app/crm/admin/taxonomies/taxonomy-manager.tsx`
- Modify: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Produces stable slug normalization `toTaxonomySlug(name: string): string` for new interests/sources; existing slugs never change on rename.
- Produces transactional RPCs `manage_interest`, `manage_tag`, and `manage_source`, callable only by Admin/State Organizer. Each supports create, rename/display metadata updates, and active/inactive state changes without deleting referenced rows.
- Admin/State Organizer can read inactive taxonomy rows on the admin screen; normal organizer selectors continue showing active rows only.
- Every create/update/deactivate/reactivate appends an audit event containing taxonomy type/id and changed non-PII fields.

- [ ] Add failing unit tests for deterministic slug generation, duplicate/empty names, source category validation, and immutable existing slug behavior.
- [ ] Add failing pgTAP tests proving Admin/State Organizer can manage all three taxonomy types, County/Volunteer cannot, inactive rows remain referenced safely, and audit entries are appended.
- [ ] Add the role-aware management RPCs/RLS needed for inactive admin reads while preserving active-only ordinary reads.
- [ ] Build taxonomy data loader, server actions, and a responsive manager grouped into Sources, Tags, and Interests with create/edit/deactivate/reactivate controls.
- [ ] Run focused tests, full database suite, lint/typecheck/build.
- [ ] Commit as `feat: add taxonomy administration`.

### Task 4: Duplicate review and audited transactional merge

**Files:**
- Create: `supabase/migrations/202608310013_duplicate_merge.sql`
- Modify: `supabase/tests/admin_data_operations.test.sql`
- Create: `src/lib/admin/duplicates.ts`
- Create: `tests/admin/duplicates.test.ts`
- Create: `src/app/crm/admin/duplicates/page.tsx`
- Create: `src/app/crm/admin/duplicates/actions.ts`
- Create: `src/app/crm/admin/duplicates/duplicate-review.tsx`
- Modify: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Adds nullable `people.merged_into_person_id uuid references people(id) on delete restrict` and index for merged-record lookup.
- Produces `public.resolve_duplicate_candidate(p_candidate_id uuid, p_resolution text, p_primary_person_id uuid default null)` for Admin/State Organizer only.
- `p_resolution = 'keep_separate'` marks the candidate reviewed without altering either person.
- `p_resolution = 'merge'` requires the selected primary to be one side of the candidate. The function locks both people, archives the merged-away row, sets `merged_into_person_id`, fills only missing canonical contact/geography fields from the merged row, ORs `do_not_contact`, re-parents `person_sources`, `activities`, `internal_notes`, `tasks`, and `consent_events`, unions relationship/interest/tag/staff-person assignment join rows without duplicate-key loss, reconciles other open duplicate-candidate references, marks the reviewed candidate `merged`, adds `duplicate_merged` activity to the canonical person, and appends an audit event.
- No person row is physically deleted by the merge workflow.

- [ ] Add failing mapping/unit tests for side-by-side duplicate display and canonical-person selection validation.
- [ ] Add pgTAP fixtures with history on both people and failing assertions covering unauthorized merge, keep-separate, full history preservation, join-row union, do-not-contact preservation, merged-person archival/linkage, open-candidate reconciliation, activity creation, and audit creation.
- [ ] Implement `merged_into_person_id` and the transactional resolution RPC until pgTAP passes.
- [ ] Build RLS-scoped duplicate queue and side-by-side review UI with explicit canonical-person choice and destructive confirmation text before merge.
- [ ] Add server action with input validation/revalidation and run focused/full verification.
- [ ] Commit as `feat: add duplicate review and merge`.

### Task 5: Guided Admin CSV import

**Files:**
- Create: `supabase/migrations/202608310014_csv_import.sql`
- Modify: `supabase/tests/admin_data_operations.test.sql`
- Create: `src/lib/admin/csv.ts`
- Create: `src/lib/admin/import-preview.ts`
- Create: `tests/admin/csv.test.ts`
- Create: `tests/admin/import-preview.test.ts`
- Create: `src/app/crm/admin/import/page.tsx`
- Create: `src/app/crm/admin/import/actions.ts`
- Create: `src/app/crm/admin/import/csv-import-wizard.tsx`
- Modify: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Produces dependency-free RFC4180-compatible `parseCsv(text)` handling CRLF/LF, quoted commas/newlines, and doubled quotes; rejects malformed unterminated quotes.
- Import file limit is 2 MiB and 5,000 data rows per operation.
- Canonical import fields are `first_name`, `last_name`, `email`, `phone`, `zip_code`, `municipality`, `engagement_stage`, `relationship`, `interests`, `tags`, `source`. The wizard lets Admin map input headers to these fields before preview.
- `previewCsvImport(fileText, mapping)` validates/normalizes rows with the same email/phone/ZIP conventions used by intake/Quick Add and classifies each row as `new`, `exact_email_match`, `ambiguous_phone_match`, or `invalid` using server-side database lookups.
- Exact normalized email defaults to updating the existing canonical person with only missing basic fields plus import source/activity; it never creates a duplicate person. Ambiguous phone/last-name rows default to `skip` until Admin explicitly chooses `create_new` or an RLS-visible existing person. Invalid rows cannot be applied.
- Produces Admin-only RPC `apply_csv_import(p_filename text, p_rows jsonb)` that applies validated row decisions transactionally, records `person_sources`/`csv_imported` activity, ensures taxonomy associations without deleting existing associations, and appends one non-PII audit summary with imported/updated/skipped counts.

- [ ] Add failing parser tests for quoted commas, embedded newlines, escaped quotes, CRLF, empty cells, malformed input, row/size limits.
- [ ] Add failing preview tests for required name/contact rules, ZIP validation, exact email classification, ambiguous phone+last-name classification, duplicate mapped columns, and invalid engagement stage.
- [ ] Add failing pgTAP tests proving only Admin can apply imports, exact-email rows update rather than duplicate, explicit create-new ambiguous rows create a person, skipped rows write nothing, source/activity/taxonomy history is preserved, and audit summary is appended without row PII.
- [ ] Implement parser, mapping/normalization, preview lookup, transactional apply RPC, and generated DB types.
- [ ] Build upload → map columns → preview errors/duplicate decisions → apply summary wizard. Never log uploaded CSV contents.
- [ ] Run focused/full unit/db tests, lint/typecheck/build.
- [ ] Commit as `feat: add guided csv import`.

### Task 6: Admin-only filtered CSV export and audit log UI

**Files:**
- Create: `src/lib/admin/export.ts`
- Create: `tests/admin/export.test.ts`
- Create: `src/app/crm/admin/export/route.ts`
- Create: `src/app/crm/admin/audit/page.tsx`
- Create: `src/lib/admin/audit.ts`
- Modify: `src/app/crm/people/page.tsx`
- Modify: `src/app/crm/people/people-filters.tsx`

**Interfaces:**
- Produces `buildPeopleExportRows(filters: PeopleFilterState)` reusing existing directory filter parsing/query semantics and Admin RLS scope.
- Export columns are `person_id`, `first_name`, `last_name`, `email`, `phone`, `zip_code`, `county`, `municipality`, `engagement_stage`, `assigned_organizer`, `relationships`, `interests`, `tags`, `do_not_contact`, `created_at`, `last_activity_at`. Internal note bodies are excluded.
- `GET /crm/admin/export?...people filters...` requires Admin + MFA, returns UTF-8 CSV with RFC4180 escaping and `Content-Disposition: attachment`, and appends audit action `people_csv_exported` with filters and row count but no exported contact data.
- People directory shows `Export CSV` only for Admin and carries the current filter query into the export route.
- `/crm/admin/audit` is Admin-only, newest-first, paginated, and shows actor/action/target/time plus safe metadata summaries.

- [ ] Add failing unit tests for CSV escaping, stable header order, exclusion of internal-note data, and filter serialization reuse.
- [ ] Add authorization test coverage proving non-Admin export/audit access is rejected.
- [ ] Implement export row mapping/CSV serialization, route authorization/download response, and audit append.
- [ ] Add Admin-only filtered export control to People and build paginated audit viewer.
- [ ] Run focused tests plus lint/typecheck/build and database verification.
- [ ] Commit as `feat: add admin exports and audit viewer`.

### Task 7: Administration acceptance pass

**Files:**
- Create: `tests/e2e/admin-data-operations.spec.ts`
- Modify: `tests/e2e/support/staff-session.ts`
- Modify: `README.md`

**Interfaces:**
- Validates an integrated synthetic-data operating loop: Admin MFA login → staff access update → taxonomy create/deactivate → duplicate keep-separate/merge path → CSV import preview/apply → filtered CSV export → audit-log confirmation.
- Includes negative browser assertions that County Organizer/Volunteer cannot reach admin data-operation screens and that State Organizer receives only duplicate/taxonomy administration, not staff/import/export/audit controls.

- [ ] Add Chromium/WebKit acceptance cases using per-browser synthetic identities and data fixtures.
- [ ] Run `npm ci`, lint, typecheck, unit tests, production build, production dependency audit, Supabase reset/migrations, full pgTAP suite, Chromium, and WebKit.
- [ ] Fix only verified regressions until the entire suite is green.
- [ ] Update README with administration routes, permissions, CSV limits/behavior, duplicate-merge preservation rules, and audit/export safety notes.
- [ ] Commit as `test: verify administration data operations`.
