# LPNY Supporter CRM

Standalone supporter and activist CRM for the Libertarian Party of New York.

The v1 architecture and implementation roadmap are documented under `docs/superpowers/`. The application uses Next.js for the responsive web UI and Supabase for PostgreSQL, authentication, MFA, and Row-Level Security.

## Foundation status

This branch establishes:

- Next.js + TypeScript application foundation
- Supabase local development configuration
- canonical New York county and staff-role data model
- supporter/workflow schema for people, relationships, interests, tags, sources, activities, notes, tasks, consent, assignments, and duplicate candidates
- database-enforced Admin / State Organizer / County Organizer / Volunteer-Staff access boundaries
- invite-only staff login surface
- TOTP MFA enrollment and verification
- protected `/crm` shell
- unit, database-policy, and browser-level tests

Public supporter intake and organizer workflow screens are intentionally implemented in later roadmap phases.

## Local development

Requirements: Node.js 22+, npm, Docker, and the Supabase CLI.

1. `npm install`
2. `npm run supabase:start`
3. `cp .env.example .env.local`
4. Replace `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` with the anon key printed by `supabase status`.
5. `npm run supabase:reset`
6. Regenerate database types when the schema changes: `npx supabase gen types typescript --local > src/lib/supabase/database.types.ts`
7. `npm run dev`

## Verification

GitHub Actions runs application, database-policy, and browser checks for branch/PR changes.

Run the application checks locally:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Run database/RLS tests with local Supabase running:

```bash
npm run supabase:reset
npm run test:db
```

Run the browser test after local Supabase is running and `.env.local` is configured:

```bash
npx playwright install chromium
npm run test:e2e
```

## Environment safety

Production supporter records, production database dumps, production access tokens, and production service-role keys must **never** be used in local or staging environments. Development and automated tests use lookup seeds and synthetic fixtures only.

The browser receives only the public Supabase URL and anon/publishable credential. Privileged service-role credentials must never be exposed through `NEXT_PUBLIC_*` environment variables.

## Documents

- `2026-08-23-supporter-crm-v1-design.md` — approved v1 product and architecture specification
- `docs/superpowers/plans/2026-08-23-supporter-crm-v1-roadmap.md` — staged v1 implementation roadmap
- `docs/superpowers/plans/2026-08-23-foundation-auth-data-model.md` — foundation implementation plan
