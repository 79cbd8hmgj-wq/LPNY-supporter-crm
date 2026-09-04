# Production Launch Checklist

Do not launch the CRM with real supporter data until every required item below is verified for the exact Production release commit.

## 1. Repository and release

- [ ] Phase 6 pull request is fully reviewed/accepted and no longer draft.
- [ ] Repository CI is green on the exact release head: lint, typecheck, unit tests, production build, dependency audit, migrations, database/RLS tests, Chromium E2E, and mobile WebKit E2E.
- [ ] Production deployment uses the exact verified commit SHA.
- [ ] `GET /api/health` returns that exact 40-character SHA in `commitSha`, its first seven characters in `release`, and `Cache-Control: no-store, max-age=0`.
- [ ] The signed-in CRM footer's abbreviated release matches the first seven characters of the verified commit SHA.
- [ ] All database changes are committed versioned migrations.
- [ ] No uncommitted/dashboard-only database configuration is required for core behavior.

## 2. Environment isolation

- [ ] Local uses synthetic seeded data only.
- [ ] Staging uses a dedicated Supabase project containing no Production supporter records.
- [ ] Production uses a dedicated Supabase project and Production-only credentials.
- [ ] Staging and Production application deployments point to the correct matching Supabase projects.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is server-only and not exposed to browser bundles, public logs, or untrusted preview deployments.
- [ ] No Production secrets exist in repository files or committed examples.

## 3. Supabase Auth and staff access

- [ ] Email/password staff sign-in works in Production.
- [ ] Public staff self-signup remains disabled.
- [ ] Production Supabase Site URL matches the Production application origin.
- [ ] Allowed redirect URLs contain only intended trusted Production origins/paths.
- [ ] A real staff invitation lands on the correct Production application rather than Local/Staging.
- [ ] TOTP MFA enrollment works.
- [ ] Protected CRM access requires MFA.
- [ ] Disabled staff accounts cannot retrieve protected data.
- [ ] At least two authorized Admin accounts exist or an organizational recovery process for Admin access is documented.

## 4. Database security

- [ ] All migrations apply cleanly to Staging before Production.
- [ ] Database/RLS verification is green on the release commit.
- [ ] Admin receives intended statewide/Admin-only access.
- [ ] State Organizer receives statewide operational access but not Admin-only exports/staff management.
- [ ] County Organizer scope is limited to assigned counties.
- [ ] Volunteer/Staff scope is limited to explicitly assigned contacts/work.
- [ ] Public intake credentials/endpoints cannot read protected supporter records.
- [ ] Authenticated users cannot bypass restricted duplicate, audit, export, or rate-limit boundaries with direct API calls.

## 5. Public intake and privacy

- [ ] `/get-involved` validates input server-side.
- [ ] Honeypot/bot trap remains active.
- [ ] Database-backed intake rate limiting is active.
- [ ] The rate limiter stores only HMAC client buckets, not raw IP addresses.
- [ ] Rate-limit failure is fail-closed and logs only a generic operational message.
- [ ] Public intake returns generic error/success responses and never reveals whether a supporter already exists.
- [ ] Submission size limits are active.
- [ ] No supporter PII is present in URLs.
- [ ] No supporter PII, request bodies, Auth tokens, or secrets are written to logs unnecessarily.

## 6. Security headers and dependency posture

- [ ] Production responses include `X-Content-Type-Options: nosniff`.
- [ ] Production responses include `X-Frame-Options: DENY`.
- [ ] Production responses include `Referrer-Policy: strict-origin-when-cross-origin`.
- [ ] Production responses disable camera, microphone, and geolocation through `Permissions-Policy`.
- [ ] CSP contains at least `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`, and `object-src 'none'`.
- [ ] Production dependency audit reports no unresolved known vulnerabilities accepted for launch.

## 7. Staging acceptance

- [ ] The exact release commit is deployed to Staging.
- [ ] Staging uses synthetic/non-production data.
- [ ] Staging Supabase Auth Site URL/redirect settings are correct.
- [ ] Staging database migrations are current.
- [ ] Full deployed browser E2E passes with `PLAYWRIGHT_BASE_URL=<staging origin>` and `PLAYWRIGHT_TARGET_ENV=staging`.
- [ ] Chromium passes against deployed Staging.
- [ ] Mobile WebKit passes against deployed Staging.
- [ ] Any disposable staff/supporter records created by staging E2E are acceptable and do not overlap Production identities/data.

## 8. Backups and recovery

- [ ] Production automated Supabase backups are enabled.
- [ ] Current retention/recovery capability is documented.
- [ ] Point-in-time recovery status is explicitly recorded if available on the selected plan.
- [ ] `docs/backup-recovery.md` has been reviewed by the Production operator.
- [ ] A recovery drill has been completed with synthetic non-Production data.
- [ ] Last known-good application rollback procedure is understood.
- [ ] Release commit SHA and latest migration are recorded before launch.

## 9. Operational workflows

- [ ] Admin staff invitation/disable/reactivate flows work.
- [ ] Dashboard and People directory respect RLS scope.
- [ ] Supporter profile/history loads correctly.
- [ ] Follow-up tasks/actions work.
- [ ] Mobile Quick Add works for eligible organizer roles.
- [ ] Duplicate review/merge remains audited and history-preserving.
- [ ] Guided CSV import works with preview/duplicate safeguards.
- [ ] Admin-only filtered CSV export works and generates an audit event.
- [ ] Taxonomy management works for intended roles.
- [ ] Reporting/source-performance metrics load correctly.

## 10. Production-safe smoke checks

After deployment, perform only non-mutating or explicitly controlled checks:

- [ ] Public home/Get Involved page loads.
- [ ] Public `/api/health` reports only `status`, `release`, and `commitSha`; the SHA matches the approved Production release.
- [ ] Security headers are present on live responses.
- [ ] `/crm` redirects unauthenticated users to login.
- [ ] One authorized Production Admin can sign in and satisfy MFA.
- [ ] Read-only dashboard/People views load with expected scope.
- [ ] No full mutating Playwright E2E suite is run against Production.
- [ ] No fake test supporter is submitted through Production merely to prove intake works unless explicitly approved and immediately handled under the organization's real-data policy.

## 11. Final go/no-go

Launch is **NO-GO** if any of the following remains unresolved:

- Production and Staging share supporter data or privileged credentials.
- Automated Production backups are not enabled/verified.
- Auth Site URL/invitation routing is unverified.
- RLS/security tests are not green.
- Full Staging E2E is not green on the release commit.
- Production dependency/security review has an unresolved high-risk finding.
- The exact Production deployment commit differs from the verified release commit.

When all required checks are complete, record the launch date, Production commit SHA, migration state, responsible operator, and any explicitly accepted non-blocking follow-up items.
