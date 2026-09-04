# Deployment and Environment Contract

This CRM has three explicit environments: Local, Staging, and Production. Their data, credentials, Auth configuration, and test behavior must remain isolated.

## Environment matrix

| Concern | Local | Staging | Production |
| --- | --- | --- | --- |
| Application | `http://localhost:3000` | Vercel staging deployment | Vercel production deployment |
| Database/Auth | Local Supabase CLI | Dedicated staging Supabase project | Dedicated production Supabase project |
| Data | Seeded/synthetic only | Synthetic/non-production only | Real supporter data |
| Mutating Playwright E2E | Yes | Yes | **No** |
| Service-role credential | Local key only | Staging key only | Production key only |
| Staff invitations | Local test accounts | Test staff only | Real authorized staff |

Production supporter records must never be copied into Local or Staging for convenience, debugging, demos, or test fixtures.

## Application environment variables

The application requires:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Vercel also supplies `VERCEL_GIT_COMMIT_SHA` at build/runtime. The application treats only a
valid 40-character Git SHA from that variable as public build metadata; it is not an application
secret and does not need to be copied into local environment files. The CRM footer displays its
first seven characters (or `local` when no valid SHA is available).

Rules:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must point to the same environment's Supabase project.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. It must never use a `NEXT_PUBLIC_` prefix, be committed to the repository, printed in logs, or exposed to browser code.
- Staging credentials must not be present in Production and Production credentials must not be present in Local/Staging.
- Rotate a secret immediately if it is ever exposed outside its intended environment.

`.env.example` documents names only. Real values belong in local ignored environment files or the deployment provider's encrypted environment-variable store.

## Playwright deployment targeting

Local E2E remains the default:

```bash
npm run test:e2e
```

For a deployed staging application, provide both:

```text
PLAYWRIGHT_BASE_URL=https://<staging-host>
PLAYWRIGHT_TARGET_ENV=staging
```

When `PLAYWRIGHT_BASE_URL` is set, Playwright does not start the local Next.js server. The E2E suite is intentionally mutating, so the configuration rejects remote targets unless `PLAYWRIGHT_TARGET_ENV=staging`.

A deployed staging E2E run must also receive the **staging** values for the three Supabase application variables above because the browser support utilities create disposable staff/test records directly in the staging project.

Do not point the full E2E suite at Production.

## Supabase Auth configuration

Configure Auth independently in each Supabase project.

Required launch checks:

- Email/password authentication is enabled for staff sign-in.
- Public self-signup remains disabled; internal staff accounts are created through Admin invitation flows only.
- TOTP MFA is available and the CRM continues to require MFA before protected access.
- The Supabase **Site URL** matches that environment's application origin.
- Any allowed redirect URLs are limited to the corresponding environment's trusted application origins.

The current staff invitation action calls `inviteUserByEmail` without a custom `redirectTo`, so the Supabase Site URL is part of the invitation-link contract and must be verified before sending real Production invitations.

## Vercel configuration

For each deployed environment:

1. Connect the deployment to this repository and the intended branch/environment.
2. Set only that environment's Supabase values.
3. Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the client or to preview environments that are not explicitly trusted.
4. Require successful repository CI before promoting a commit.
5. Record the deployed commit SHA in the launch/change record.

### Deployment identity verification

The unauthenticated `GET /api/health` endpoint returns only an `ok` status, the abbreviated
release, and the validated full `VERCEL_GIT_COMMIT_SHA`. It deliberately does not inspect or
return any other environment variables, credentials, host details, database state, or user data.
Responses use `Cache-Control: no-store, max-age=0` so operators and intermediaries do not reuse a
version response from an earlier deployment.

After deploying, compare the endpoint's `commitSha` with the exact 40-character SHA approved in
repository CI:

```bash
curl --fail --silent --show-error https://<deployment-host>/api/health
```

The full SHA must match exactly, and `release` must equal its first seven characters. A `null`
`commitSha` or `local` release is expected for local development but is a deployment configuration
failure in Staging or Production. The signed-in CRM footer provides a quick visual cross-check of
the same abbreviated release.

Staging must be reachable by the browser test runner before deployed E2E is considered verified.

## Production data and diagnostics

Production diagnostics must be useful without copying or logging supporter PII.

Do not log:

- supporter names, email addresses, phone numbers, ZIPs, notes, consent details, or internal IDs merely for debugging;
- raw public-client IP addresses;
- request bodies from intake/import/export workflows;
- Auth tokens or Supabase secrets.

Prefer bounded operational messages such as `Intake rate limit check failed` or an internal error category. If deeper debugging is required, reproduce with synthetic data in Local/Staging.

## Promotion sequence

1. Merge a fully green repository commit.
2. Apply migrations to Staging.
3. Deploy the same commit to Staging.
4. Verify Auth configuration, migrations, RLS, and staging-only deployed E2E.
5. Complete the backup/recovery checks in `docs/backup-recovery.md`.
6. Complete `docs/production-launch-checklist.md`.
7. Apply the verified migrations to Production.
8. Deploy the exact verified commit to Production.
9. Run production-safe, non-mutating smoke checks only.

Never use a Production deployment as the first place a migration, Auth setting, or CRM workflow is exercised.
