# LPNY Supporter CRM

Standalone supporter and activist CRM for the Libertarian Party of New York.

The v1 architecture and implementation roadmap are documented under `docs/superpowers/`. The application uses Next.js for the responsive web UI and Supabase for PostgreSQL, authentication, MFA, and Row-Level Security.

## Implemented foundation

- Next.js + TypeScript application foundation
- Supabase local development configuration
- canonical New York county and staff-role data model
- supporter/workflow schema for people, relationships, interests, tags, sources, activities, notes, tasks, consent, assignments, and duplicate candidates
- database-enforced Admin / State Organizer / County Organizer / Volunteer-Staff access boundaries
- invite-only staff login with TOTP MFA
- protected `/crm` shell
- public `/get-involved` supporter intake flow with server-isolated privileged writes
- ZIP-based New York county routing, duplicate-safe intake, consent/source/activity history, and initial follow-up queue creation
- unit, database-policy, and browser-level tests

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

## Environment safety

Production supporter records, production database dumps, production access tokens, and production service-role keys must **never** be used in local or staging environments. Development and automated tests use lookup seeds and synthetic fixtures only.

The browser receives only the public Supabase URL and anon/publishable credential. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed through a `NEXT_PUBLIC_*` environment variable or client component.

## Documents

- `2026-08-23-supporter-crm-v1-design.md` — approved v1 product and architecture specification
- `docs/superpowers/specs/2026-08-23-supporter-intake-design.md` — public intake design
- `docs/superpowers/plans/2026-08-23-supporter-crm-v1-roadmap.md` — staged v1 implementation roadmap
- `docs/superpowers/plans/2026-08-23-foundation-auth-data-model.md` — foundation implementation plan
- `docs/superpowers/plans/2026-08-23-supporter-intake.md` — supporter intake implementation plan
