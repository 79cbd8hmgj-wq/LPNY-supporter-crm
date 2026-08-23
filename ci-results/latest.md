# CI verification

Commit: `4f71186501f3c877ec3039ca280eb8573517767c`

- Dependency install: **success**
- App lint/typecheck/unit/build/audit: **failure**
- Supabase CLI setup: **success**
- Database migrations/RLS: **failure**
- Local Supabase environment: **skipped**
- Protected CRM E2E: **skipped**

## ci-install.log
```text
npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
npm warn deprecated eslint@9.39.5: This version is no longer supported. Please see https://eslint.org/version-support for other options.

added 495 packages, and audited 496 packages in 21s

171 packages are looking for funding
  run `npm fund` for details

3 high severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
```

## ci-app.log
```text

> lpny-supporter-crm@0.1.0 lint
> eslint .


> lpny-supporter-crm@0.1.0 typecheck
> tsc --noEmit


> lpny-supporter-crm@0.1.0 test
> vitest run


[1m[46m RUN [49m[22m [36mv3.2.7 [39m[90m/home/runner/work/LPNY-supporter-crm/LPNY-supporter-crm[39m

 [32m✓[39m tests/auth/access.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 6[2mms[22m[39m

[31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Suites 1 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m tests/e2e/protected-crm.spec.ts[2m [ tests/e2e/protected-crm.spec.ts ][22m
[31m[1mError[22m: Playwright Test did not expect test() to be called here.
Most common reasons include:
- You are calling test() in a configuration file.
- You are calling test() in a file that is imported by the configuration file.
- You have two different versions of @playwright/test. This usually happens
  when one of the dependencies in your package.json depends on @playwright/test.
- You are calling test() from an async test.describe() block. Only sync ones are supported.[39m
[90m [2m❯[22m _TestTypeImpl._currentSuite node_modules/playwright/lib/common/index.js:[2m2263:13[22m[39m
[90m [2m❯[22m _TestTypeImpl._createTest node_modules/playwright/lib/common/index.js:[2m2277:24[22m[39m
[90m [2m❯[22m node_modules/playwright/lib/common/index.js:[2m1209:12[22m[39m
[36m [2m❯[22m tests/e2e/protected-crm.spec.ts:[2m3:1[22m[39m
    [90m  1| [39m[35mimport[39m { expect[33m,[39m test } [35mfrom[39m [32m"@playwright/test"[39m[33m;[39m
    [90m  2| [39m
    [90m  3| [39mtest("unauthenticated user is redirected from CRM to login", async ({ …
    [90m   | [39m[31m^[39m
    [90m  4| [39m  [35mawait[39m page[33m.[39m[34mgoto[39m([32m"/crm"[39m)[33m;[39m
    [90m  5| [39m  [35mawait[39m [34mexpect[39m(page)[33m.[39m[34mtoHaveURL[39m([36m/\/login/[39m)[33m;[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯[22m[39m


[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m1 passed[39m[22m[90m (2)[39m
[2m      Tests [22m [1m[32m5 passed[39m[22m[90m (5)[39m
[2m   Start at [22m 10:27:25
[2m   Duration [22m 2.90s[2m (transform 69ms, setup 155ms, collect 31ms, tests 6ms, environment 831ms, prepare 224ms)[22m


::error file=/home/runner/work/LPNY-supporter-crm/LPNY-supporter-crm/tests/e2e/protected-crm.spec.ts,title=tests/e2e/protected-crm.spec.ts,line=3,column=1::Error: Playwright Test did not expect test() to be called here.%0AMost common reasons include:%0A- You are calling test() in a configuration file.%0A- You are calling test() in a file that is imported by the configuration file.%0A- You have two different versions of @playwright/test. This usually happens%0A  when one of the dependencies in your package.json depends on @playwright/test.%0A- You are calling test() from an async test.describe() block. Only sync ones are supported.%0A ❯ _TestTypeImpl._currentSuite node_modules/playwright/lib/common/index.js:2263:13%0A ❯ _TestTypeImpl._createTest node_modules/playwright/lib/common/index.js:2277:24%0A ❯ node_modules/playwright/lib/common/index.js:1209:12%0A ❯ tests/e2e/protected-crm.spec.ts:3:1%0A%0A
```

## ci-database.log
```text
ghcr.io/supabase/realtime:v2.129.0
753ab3b39a58: Pull complete
5c18a8cdfd6b: Pull complete
7505145a46ec: Pull complete
Digest: sha256:cef71ba901751dcc242cc685cf13786935ea8926820fb342f23bb0fbef77de5a
Status: Downloaded newer image for ghcr.io/supabase/postgres-meta:v0.98.0
ghcr.io/supabase/postgres-meta:v0.98.0
0f248d4fdffd: Pull complete
731b962a30ac: Pull complete
7e1afeac9515: Pull complete
7dd51689e5de: Pull complete
4f4fb700ef54: Pull complete
b7d0efd3fc9c: Pull complete
c0c4dc518956: Pull complete
512fd86e6200: Pull complete
662b1f44f1ee: Pull complete
ba9e24d39072: Pull complete
Digest: sha256:c52405002a890ca9fcf77978671c57f3a988e03174afb277f84ac65bc917013c
Status: Downloaded newer image for ghcr.io/supabase/edge-runtime:v1.74.3
ghcr.io/supabase/edge-runtime:v1.74.3
264588d8dd60: Pull complete
Digest: sha256:08dc77f12e08faacc55960fef1dce37fa73d16acb52abeb216aa23dc5e70824b
Status: Downloaded newer image for ghcr.io/supabase/studio:2026.08.17-sha-0c1da8f
ghcr.io/supabase/studio:2026.08.17-sha-0c1da8f
ad8cc52b5158: Pull complete
5fc99faf3b9a: Pull complete
70b9c97b39c0: Pull complete
7be4889067d6: Pull complete
Digest: sha256:97ed68d33417d253a45fe0a70f84324d92250a3e239bf18aa6cf87269dbf6727
Status: Downloaded newer image for ghcr.io/supabase/storage-api:v1.69.11
ghcr.io/supabase/storage-api:v1.69.11
daa7c753cf32: Pull complete
c61d94d80b8d: Pull complete
73d5273f17e0: Pull complete
5d4d12d40ee2: Pull complete
bec4cd2d8288: Pull complete
95553dc9aee4: Pull complete
cef3e4219e2d: Pull complete
83a5975346e8: Pull complete
848b1c5912e5: Pull complete
f2c897740b67: Pull complete
0f819c04149e: Pull complete
4e5b5a409361: Pull complete
addf9dc09fca: Pull complete
1e3ae6415742: Pull complete
2d3eb0cf3634: Pull complete
cb6a11cda9f8: Pull complete
5904fe0a8541: Pull complete
484e22708485: Pull complete
5bd4dd8b80e3: Pull complete
a00ab32c0cad: Pull complete
7df60113bd5f: Pull complete
1f87a4556ee4: Pull complete
586e7e55dc38: Pull complete
58c2f4245eec: Pull complete
826b8d755762: Pull complete
18e11daf70d2: Pull complete
9ace01da70a3: Pull complete
1f04457496a9: Pull complete
2a75afedac1e: Pull complete
f54c636bbcd3: Pull complete
ab6d1e52f2bb: Pull complete
e12ac39a69ef: Pull complete
04364d336696: Pull complete
e68f98342a0d: Pull complete
669f792103a4: Pull complete
f80d99bfabdb: Pull complete
d0ebd75bb4ef: Pull complete
a1028bd6f848: Pull complete
44bd6c2c1e25: Pull complete
Digest: sha256:af083ef64d0408c8f098ee6f5c364a59b26f36fbc0f3a334a62c5c1d57362e9b
Status: Downloaded newer image for ghcr.io/supabase/postgres:15.8.1.085
ghcr.io/supabase/postgres:15.8.1.085
Starting database...
Initialising schema...
Seeding globals from roles.sql...
Applying migration 202608230001_core_enums_and_staff.sql...
Applying migration 202608230002_people_taxonomy_and_workflow.sql...
Applying migration 202608230003_rls_and_access_helpers.sql...
Applying migration 202608230004_authenticated_table_grants.sql...
Seeding data from supabase/seed.sql...
Starting containers...
Waiting for health checks...
Started supabase local development setup.

╭──────────────────────────────────────╮
│ 🔧 Development Tools                 │
├─────────┬────────────────────────────┤
│ Studio  │ http://127.0.0.1:54323     │
│ Mailpit │ http://127.0.0.1:54324     │
│ MCP     │ http://127.0.0.1:54321/mcp │
╰─────────┴────────────────────────────╯

╭──────────────────────────────────────────────────────╮
│ 🌐 APIs                                              │
├────────────────┬─────────────────────────────────────┤
│ Project URL    │ http://127.0.0.1:54321              │
│ REST           │ http://127.0.0.1:54321/rest/v1      │
│ GraphQL        │ http://127.0.0.1:54321/graphql/v1   │
│ Edge Functions │ http://127.0.0.1:54321/functions/v1 │
╰────────────────┴─────────────────────────────────────╯

╭───────────────────────────────────────────────────────────────╮
│ ⛁ Database                                                    │
├─────┬─────────────────────────────────────────────────────────┤
│ URL │ postgresql://postgres:postgres@127.0.0.1:54322/postgres │
╰─────┴─────────────────────────────────────────────────────────╯

╭──────────────────────────────────────────────────────────────╮
│ 🔑 Authentication Keys                                       │
├─────────────┬────────────────────────────────────────────────┤
│ Publishable │ sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH │
│ Secret      │ sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz      │
╰─────────────┴────────────────────────────────────────────────╯

╭───────────────────────────────────────────────────────────────────────────────╮
│ 📦 Storage (S3)                                                               │
├────────────┬──────────────────────────────────────────────────────────────────┤
│ URL        │ http://127.0.0.1:54321/storage/v1/s3                             │
│ Access Key │ 625729a08b95bf1b7ff351a663f3a23c                                 │
│ Secret Key │ 850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907 │
│ Region     │ local                                                            │
╰────────────┴──────────────────────────────────────────────────────────────────╯
Local dev security notice
All services bind to 0.0.0.0 (network-accessible, not just localhost)
API keys and JWT secrets are shared defaults. Do not use in production
Studio, pgMeta (/pg/*), and analytics have no authentication

Resetting local database...
WARN: config section [inbucket] is deprecated. Please use [local_smtp] instead.
Recreating database...
Initialising schema...
Seeding globals from roles.sql...
Applying migration 202608230001_core_enums_and_staff.sql...
Applying migration 202608230002_people_taxonomy_and_workflow.sql...
Applying migration 202608230003_rls_and_access_helpers.sql...
Applying migration 202608230004_authenticated_table_grants.sql...
Seeding data from supabase/seed.sql...
Restarting containers...
Finished supabase db reset on branch feat/foundation-auth-data-model.
Connecting to local database...
3.36: Pulling from supabase/pg_prove
dcccee43ad5d: Pulling fs layer
06d62d0de6d7: Pulling fs layer
a22cb17b3b93: Pulling fs layer
4f4fb700ef54: Pulling fs layer
4f4fb700ef54: Waiting
a22cb17b3b93: Verifying Checksum
a22cb17b3b93: Download complete
06d62d0de6d7: Verifying Checksum
06d62d0de6d7: Download complete
dcccee43ad5d: Verifying Checksum
dcccee43ad5d: Download complete
4f4fb700ef54: Verifying Checksum
4f4fb700ef54: Download complete
dcccee43ad5d: Pull complete
06d62d0de6d7: Pull complete
a22cb17b3b93: Pull complete
4f4fb700ef54: Pull complete
Digest: sha256:eda7c5e68719e9c8287e78c017118407b48df904a51c935f5ab6098b8c0bc6bc
Status: Downloaded newer image for ghcr.io/supabase/pg_prove:3.36
ghcr.io/supabase/pg_prove:3.36
/home/runner/work/LPNY-supporter-crm/LPNY-supporter-crm/supabase/tests/rls_access.test.sql .. 
# Failed test 25: "threw Albany County Organizer cannot insert an Erie person"
#       caught: 42501: new row violates row-level security policy for table "people"
#       wanted: an exception: Albany County Organizer cannot insert an Erie person
# Failed test 26: "threw Volunteer/Staff cannot insert canonical people records"
#       caught: 42501: new row violates row-level security policy for table "people"
#       wanted: an exception: Volunteer/Staff cannot insert canonical people records
# Looks like you failed 2 tests of 26
Failed 2/26 subtests 

Test Summary Report
-------------------
/home/runner/work/LPNY-supporter-crm/LPNY-supporter-crm/supabase/tests/rls_access.test.sql (Wstat: 0 Tests: 26 Failed: 2)
  Failed tests:  25-26
Files=1, Tests=26,  0 wallclock secs ( 0.02 usr +  0.00 sys =  0.02 CPU)
Result: FAIL
[31merror running container: exit 1[39m
Try rerunning the command with --debug to troubleshoot the error.
```

