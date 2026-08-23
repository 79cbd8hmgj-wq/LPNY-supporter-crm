# CI verification

Commit: `0dd1b0ba63daf91d9a730530f12040fe794f54a3`

- Dependency install: **cancelled**
- App lint/typecheck/unit/build/audit: **skipped**
- Supabase CLI setup: **skipped**
- Database migrations/RLS: **skipped**
- Local Supabase environment: **skipped**
- Protected CRM E2E: **skipped**

## ci-install.log
```text

up to date, audited 624 packages in 3s

202 packages are looking for funding
  run `npm fund` for details

3 high severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
npm warn deprecated eslint@9.39.5: This version is no longer supported. Please see https://eslint.org/version-support for other options.
```

