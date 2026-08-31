# LPNY Supporter CRM

Standalone supporter and activist CRM for the Libertarian Party of New York.

The v1 architecture and implementation roadmap are documented under `docs/superpowers/`. The application uses Next.js for the responsive web UI and Supabase for PostgreSQL, authentication, MFA, and Row-Level Security.

## Implemented v1 workflow

- Next.js + TypeScript responsive application foundation
- Supabase local development configuration
- canonical New York county and staff-role data model
- supporter/workflow schema for people, relationships, interests, tags, sources, activities, notes, tasks, consent, assignments, and duplicate candidates
- database-enforced Admin / State Organizer / County Organizer / Volunteer-Staff access boundaries
- invite-only staff email/password login with TOTP MFA
- protected organizer dashboard with scoped queue previews, recent activity, and stage/county/source counts
- multi-filter People directory with private saved views
- supporter profiles with activity, task, source, consent, note, relationship, interest, and tag history
- role-aware organizer actions for contact outcomes, follow-ups, task completion, notes, stage changes, taxonomy, reassignment, do-not-contact, and archival
- phone-first Quick Add with RLS-visible duplicate warnings, Organizer Entry attribution, and initial follow-up routing
- public `/get-involved` supporter intake flow with server-isolated privileged writes
- ZIP-based New York county routing, duplicate-safe intake, consent/source/activity history, and initial follow-up queue creation
- Admin staff access management with audited role, status, and county-assignment changes
- Admin/State Organizer taxonomy management and duplicate review with transactional merge/history preservation
- Admin-only guided CSV import with explicit column mapping, duplicate review, validation, and atomic application
- Admin-only filtered CSV export using the People directory filter contract, stable RFC4180 serialization, spreadsheet-formula neutralization, and export auditing without contact values in audit metadata
- Admin-only append-only audit viewer with safe metadata summaries
- unit, database-policy, and Chromium/WebKit browser-level tests

## Organizer routes

- `/crm` — scoped organizer dashboard and work queues
- `/crm/people` — searchable/filterable People directory and private saved views; Admins can export the current filtered result set
- `/crm/people/[personId]` — supporter profile, history, and organizer actions
- `/crm/quick-add` — fast organizer entry for a supporter encountered by phone or in person

All CRM routes require an active staff record and TOTP-authenticated session. Database Row-Level Security remains the final authorization boundary for supporter data.

## Administration routes

- `/crm/admin` — role-aware administration landing page
- `/crm/admin/staff` — Admin-only staff invitation and access management
- `/crm/admin/taxonomies` — Admin/State Organizer management for sources, tags, and interests
- `/crm/admin/duplicates` — Admin/State Organizer duplicate review, keep-separate, and merge workflow
- `/crm/admin/import` — Admin-only guided supporter CSV import
- `/crm/admin/export?...people filters...` — Admin-only filtered supporter CSV download; normally reached through the People directory export control
- `/crm/admin/audit` — Admin-only append-only administrative audit viewer

CSV exports contain only the approved supporter-directory fields. Internal note bodies are never included. Export audit events store the row count and names of active filters, not search values or exported contact data.

## Local development

Requirements: Node.js 22+, npm, Docker, and the Supabase CLI.

1. `npm install`
2. `npm run supabase:start`
3. `cp .env.example .env.local`
4. Run `supabase status -o env` and put the local `ANON_KEY` into `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the local `SERVICE_ROLE_KEY` into `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
5. `npm run supabase:reset`
6. Regenerate database types when the schema changes: `npx supabase gen types typescript --local > src/lib/supabase/database.types.ts`
7. `npm run dev`
8. Open `/get-involved` for public supporter intake or `/login` for staff access.

## Verification

GitHub Actions runs application, database-policy, and Chromium/WebKit browser checks for branch/PR changes.

Run the application checks locally:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

Run database/RLS tests with local Supabase running:

```bash
npm run supabase:reset
npm run test:db
```

Run browser tests after local Supabase is running and `.env.local` is configured:

```bash
npx playwright install chromium webkit
npm run test:e2e
```

The browser suite covers public intake, protected CRM redirects, disabled public staff signup, staff login + MFA, Quick Add duplicate warnings, the integrated organizer workflow from dashboard queue through completed follow-up history, and the administration data-operations loop through audited import/export and role-boundary verification.

## Environment safety

Production supporter records, production database dumps, production access tokens, and production service-role keys must **never** be used in local or staging environments. Development and automated tests use lookup seeds and synthetic fixtures only.

The browser receives only the public Supabase URL and anon/publishable credential. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed through a `NEXT_PUBLIC_*` environment variable or client component.

## Documents

- `2026-08-23-supporter-crm-v1-design.md` — approved v1 product and architecture specification
- `docs/superpowers/specs/2026-08-23-supporter-intake-design.md` — public intake design
- `docs/superpowers/plans/2026-08-23-supporter-crm-v1-roadmap.md` — staged v1 implementation roadmap
- `docs/superpowers/plans/2026-08-23-foundation-auth-data-model.md` — foundation implementation plan
- `docs/superpowers/plans/2026-08-23-supporter-intake.md` — supporter intake implementation plan
- `docs/superpowers/plans/2026-08-23-organizer-workflow.md` — organizer dashboard, People directory, profiles, actions, Quick Add, and acceptance plan
- `docs/superpowers/plans/2026-08-31-administration-data-operations.md` — staff, taxonomy, duplicates, CSV import/export, audit, and administration acceptance plan
