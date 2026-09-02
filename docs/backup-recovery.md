# Backup and Recovery Runbook

This runbook covers the Supabase/PostgreSQL data and the Vercel application used by the LPNY Supporter CRM.

The goal is to restore service without losing auditability, bypassing Row-Level Security, or spreading Production supporter data into development environments.

## Production prerequisites

Before the first real supporter is stored in Production:

- Supabase automated database backups are enabled for the Production project.
- The current backup retention/recovery options are recorded by an Admin responsible for the deployment.
- A recovery procedure has been exercised with synthetic data outside Production.
- Every database change is represented by a committed migration.
- The deployed application commit SHA and the latest applied migration are recorded for each release.
- Contacts remain archived rather than routinely deleted; imports and merges remain traceable/audited.

If the selected Supabase plan offers point-in-time recovery, document whether it is enabled and its available recovery window. Do not assume point-in-time recovery exists unless the Production project confirms it.

## Before a risky Production change

Treat schema changes, bulk imports, duplicate merges at scale, and major data operations as recovery-sensitive.

1. Confirm the current Production backup status is healthy.
2. Record the current application commit SHA.
3. Record the latest applied database migration.
4. Confirm the exact migration/change to be applied was already verified in Staging.
5. Confirm a responsible operator knows how to stop or roll back the application deployment if the change fails.
6. Do not copy Production rows to Local/Staging as a backup mechanism.

## Application rollback

If the application release is broken but the database is healthy:

1. Stop promotion of additional changes.
2. Identify the last known-good Vercel deployment/commit.
3. Roll the application back to that exact commit/deployment.
4. Verify public intake, staff authentication/MFA, protected CRM access, and a read-only supporter view.
5. Determine whether the failed application wrote incompatible data before resuming normal operation.

An application rollback does **not** automatically reverse database migrations.

## Database recovery decision

Use the least destructive recovery method that restores consistency.

### Case A: bad application behavior, database still consistent

Prefer an application rollback and a forward fix. Avoid restoring the database merely to undo application code when data remains valid.

### Case B: bad migration, no meaningful Production writes afterward

Prefer a reviewed corrective migration or an explicitly supported reverse migration when it is safe and understood. Never improvise destructive SQL directly in Production.

### Case C: corrupted/deleted data or partially destructive operation

Use the Supabase project's supported backup restore or point-in-time recovery mechanism. Select a recovery point from before the damaging operation, accounting for legitimate writes that occurred afterward.

If practical, validate the candidate restore in an isolated recovery/Staging project before replacing Production. Production data used for recovery must remain access-controlled and must not become general development/test data.

## Recovery validation

After any database restore or corrective migration, verify all of the following before declaring recovery complete:

- expected migrations/schema are present;
- application starts against the recovered database;
- Admin login and MFA work;
- disabled staff remain blocked;
- County Organizer and Volunteer/Staff RLS boundaries still hold;
- public intake cannot read protected CRM records;
- supporter records, activities, tasks, consent history, sources, tags/interests/relationships, and staff assignments are internally consistent;
- archived/merged records retain their history;
- audit-sensitive operations still appear in the audit log;
- Admin-only export restrictions still hold;
- no Production secrets or PII were written to recovery logs or test artifacts.

Use read-only or synthetic verification where possible immediately after a Production recovery. Do not run the mutating full Playwright E2E suite against Production.

## Incident record

For every Production recovery event, record:

- incident start/end time;
- operator(s);
- affected deployment commit;
- affected migration/change;
- backup/recovery point used, if any;
- actions taken;
- validation performed;
- known data loss or reconciliation required;
- follow-up corrective work.

Do not put supporter PII, credentials, Auth tokens, or raw request data in the incident record.

## Recovery drill

Before launch and after material changes to the backup setup, perform a drill using synthetic Staging data:

1. Create identifiable synthetic CRM records.
2. Confirm an available backup/recovery point.
3. Simulate an application rollback and database recovery scenario.
4. Restore into an isolated non-Production target when the platform workflow permits.
5. Validate schema, RLS, Auth, and representative CRM history.
6. Document the actual provider steps and any plan-specific limitations discovered.

A backup is not considered operationally sufficient until the team has verified that a recoverable copy exists and understands the restore path.
