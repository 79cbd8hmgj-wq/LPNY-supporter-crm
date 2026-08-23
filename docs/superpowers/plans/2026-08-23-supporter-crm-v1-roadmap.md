# LPNY Supporter CRM v1 Implementation Roadmap

**Spec:** `2026-08-23-supporter-crm-v1-design.md`

The approved v1 design contains several independently testable subsystems. Implementation is therefore split into six plans rather than one oversized plan.

## Execution order

1. **Foundation, core data model, authentication, and RLS**
   - Scaffold Next.js/TypeScript application and Supabase local project.
   - Add core CRM schema, taxonomies, staff roles, county scope, person assignments, tasks, consent, sources, activities, notes, and lookup data.
   - Implement invite-only protected CRM access, MFA enforcement, and database-level Row-Level Security.
   - Prove role boundaries with database tests.

2. **Public intake and geographic routing**
   - Build `/get-involved`.
   - Normalize and validate submissions server-side.
   - Resolve source and ZIP-to-county geography.
   - Deduplicate exact email matches, flag uncertain matches, record consent/source/activity/interests, route to county/statewide queue, and create the initial follow-up task transactionally.
   - Add rate limiting and bot protection.

3. **Organizer CRM workflow**
   - Build dashboard/work queues, people directory, combined filters, supporter profile, activity timeline, tasks, notes, relationship/interests/tags management, follow-up stage transitions, and mobile Quick Add.
   - Add private saved views.

4. **Administration and data operations**
   - Build staff invitations/disablement/role and county assignment management.
   - Add duplicate review and audited merge workflow.
   - Add source/tag/interest administration.
   - Add guided CSV import preview/validation/duplicate handling and Admin-only filtered CSV exports.
   - Add append-oriented audit log for sensitive actions.

5. **Reporting and source performance**
   - Add scoped dashboard metrics, county/source/stage/relationship/interest counts, follow-up completion, overdue/unassigned metrics, and source conversion from signup through contacted/engaged/volunteer.

6. **Production hardening and deployment**
   - Add complete end-to-end tests, staging/production configuration, CI gates, Vercel/Supabase deployment documentation, backups/recovery procedures, PII-safe logging checks, and production launch checklist.

## Cross-plan rules

- Next.js responsive web application.
- Supabase-hosted PostgreSQL and Supabase Auth.
- MFA for internal users.
- Row-Level Security is the authoritative access boundary.
- One canonical person may have many interactions, sources, relationships, interests, tags, activities, tasks, and consent events.
- County Organizer access is limited to explicitly assigned counties.
- Volunteer/Staff access is limited to explicitly assigned contacts/work.
- Admin-only exports in v1.
- Public intake never exposes privileged credentials or existence of an existing supporter.
- Production PII is never used as development/test data.
- All database changes are versioned migrations.
- Each implementation plan uses TDD and ends in an independently testable deliverable.

## Deferred features

The following remain outside v1: mass email/SMS, donations/payments, event registration, BOE membership verification, Atlas integration, predictive scoring, AI recommendations, native mobile apps, and a complex custom report builder.
