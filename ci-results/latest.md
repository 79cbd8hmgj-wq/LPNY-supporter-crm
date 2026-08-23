# CI verification

Commit: `56dc336006d5ae3d4be2edac54f9c398ffcb8831`

- Dependency install: **success**
- App lint/typecheck/unit/build/audit: **success**
- Supabase CLI setup: **success**
- Database migrations/RLS: **success**
- Local Supabase environment: **success**
- Protected CRM E2E: **success**

## ci-install.log
```text
npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
npm warn deprecated eslint@9.39.5: This version is no longer supported. Please see https://eslint.org/version-support for other options.

added 498 packages, and audited 499 packages in 14s

174 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
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

 [32m✓[39m tests/auth/access.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 4[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m5 passed[39m[22m[90m (5)[39m
[2m   Start at [22m 11:52:02
[2m   Duration [22m 714ms[2m (transform 51ms, setup 75ms, collect 26ms, tests 4ms, environment 334ms, prepare 65ms)[22m


> lpny-supporter-crm@0.1.0 build
> next build

▲ Next.js 16.3.2 (Turbopack)
✓ Running next.config.ts took 26ms
⚠ No build cache found. Please configure build caching for faster rebuilds. Read more: https://nextjs.org/docs/messages/no-cache
Attention: Next.js now collects completely anonymous telemetry regarding usage.
This information is used to shape Next.js' roadmap and prioritize features.
You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
https://nextjs.org/telemetry


  Creating an optimized production build ...
✓ Compiled successfully in 8.1s
  Running TypeScript ...
  Finished TypeScript in 3.4s ...
  Collecting page data using 1 worker ...
  Generating static pages using 1 worker (0/6) ...
  Generating static pages using 1 worker (1/6) 
  Generating static pages using 1 worker (2/6) 
  Generating static pages using 1 worker (4/6) 
✓ Generating static pages using 1 worker (6/6) in 152ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /crm
├ ƒ /login
└ ƒ /mfa


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

found 0 vulnerabilities
```

## ci-database.log
```text
c80645774acf: Pull complete
ad8aa6f5f9a9: Pull complete
Digest: sha256:362659ca70eaa75ba05bbaf963caa84c1c5afe5e8fbf0777e17b830dd5f0f60a
Status: Downloaded newer image for ghcr.io/supabase/gotrue:v2.195.0
ghcr.io/supabase/gotrue:v2.195.0
5e731b050e43: Pull complete
8f99eb9866f3: Pull complete
8f99eb9866f3: Pull complete
777b5f4d3eb2: Pull complete
662b1f44f1ee: Pull complete
c350c088cde5: Pull complete
c0ed9f2d0e0e: Pull complete
c0ed9f2d0e0e: Pull complete
4f4fb700ef54: Pull complete
ba9e24d39072: Pull complete
Digest: sha256:48ee05253213f014006a20bb34d0639f936b36a78e1972ec16b1985ac951d917
Status: Downloaded newer image for ghcr.io/supabase/realtime:v2.129.0
ghcr.io/supabase/realtime:v2.129.0
Digest: sha256:c52405002a890ca9fcf77978671c57f3a988e03174afb277f84ac65bc917013c
Status: Downloaded newer image for ghcr.io/supabase/edge-runtime:v1.74.3
ghcr.io/supabase/edge-runtime:v1.74.3
4b118796ff6a: Pull complete
23c96171f2fe: Pull complete
0f248d4fdffd: Pull complete
731b962a30ac: Pull complete
753ab3b39a58: Pull complete
b7d0efd3fc9c: Pull complete
5c18a8cdfd6b: Pull complete
7505145a46ec: Pull complete
c0c4dc518956: Pull complete
Digest: sha256:cef71ba901751dcc242cc685cf13786935ea8926820fb342f23bb0fbef77de5a
Status: Downloaded newer image for ghcr.io/supabase/postgres-meta:v0.98.0
ghcr.io/supabase/postgres-meta:v0.98.0
512fd86e6200: Pull complete
ad8cc52b5158: Pull complete
daa7c753cf32: Pull complete
264588d8dd60: Pull complete
Digest: sha256:08dc77f12e08faacc55960fef1dce37fa73d16acb52abeb216aa23dc5e70824b
Status: Downloaded newer image for ghcr.io/supabase/studio:2026.08.17-sha-0c1da8f
ghcr.io/supabase/studio:2026.08.17-sha-0c1da8f
5fc99faf3b9a: Pull complete
70b9c97b39c0: Pull complete
7be4889067d6: Pull complete
Digest: sha256:97ed68d33417d253a45fe0a70f84324d92250a3e239bf18aa6cf87269dbf6727
Status: Downloaded newer image for ghcr.io/supabase/storage-api:v1.69.11
ghcr.io/supabase/storage-api:v1.69.11
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
dcccee43ad5d: Verifying Checksum
dcccee43ad5d: Download complete
a22cb17b3b93: Verifying Checksum
a22cb17b3b93: Download complete
dcccee43ad5d: Pull complete
4f4fb700ef54: Verifying Checksum
4f4fb700ef54: Download complete
06d62d0de6d7: Verifying Checksum
06d62d0de6d7: Download complete
06d62d0de6d7: Pull complete
a22cb17b3b93: Pull complete
4f4fb700ef54: Pull complete
Digest: sha256:eda7c5e68719e9c8287e78c017118407b48df904a51c935f5ab6098b8c0bc6bc
Status: Downloaded newer image for ghcr.io/supabase/pg_prove:3.36
ghcr.io/supabase/pg_prove:3.36
/home/runner/work/LPNY-supporter-crm/LPNY-supporter-crm/supabase/tests/rls_access.test.sql .. ok
All tests successful.
Files=1, Tests=26,  0 wallclock secs ( 0.02 usr +  0.00 sys =  0.02 CPU)
Result: PASS
```

## ci-e2e.log
```text
Setting up libdca0:amd64 (0.0.7-2build1) ...
Setting up libzimg2:amd64 (3.0.5+ds1-1build1) ...
Setting up libopenal-data (1:1.23.1-4build1) ...
Setting up libabsl20220623t64:amd64 (20220623.1-3.1ubuntu3.2) ...
Setting up libflac12t64:amd64 (1.4.3+ds-2.1ubuntu2) ...
Setting up libgtk-4-common (4.14.5+ds-0ubuntu0.10) ...
Setting up libmpeg2encpp-2.1-0t64:amd64 (1:2.1.0+debian-8.1build1) ...
Setting up glib-networking-common (2.80.0-1build1) ...
Setting up libmfx1:amd64 (22.5.4-1) ...
Setting up libbluray2:amd64 (1:1.3.4-1build1) ...
Setting up libde265-0:amd64 (1.0.15-1ubuntu0.1) ...
Setting up libsamplerate0:amd64 (0.2.2-4build1) ...
Setting up timgm6mb-soundfont (1.3-5) ...
update-alternatives: using /usr/share/sounds/sf2/TimGM6mb.sf2 to provide /usr/share/sounds/sf2/default-GM.sf2 (default-GM.sf2) in auto mode
update-alternatives: using /usr/share/sounds/sf2/TimGM6mb.sf2 to provide /usr/share/sounds/sf3/default-GM.sf3 (default-GM.sf3) in auto mode
Setting up libva-x11-2:amd64 (2.20.0-2ubuntu0.2) ...
Setting up libyuv0:amd64 (0.0~git202401110.af6ac82-1) ...
Setting up libmplex2-2.1-0t64:amd64 (1:2.1.0+debian-8.1build1) ...
Setting up libpipewire-0.3-0t64:amd64 (1.0.5-1ubuntu3.3) ...
Setting up libopenmpt0t64:amd64 (0.7.3-1.1build3) ...
Setting up libzvbi-common (0.2.42-2) ...
Setting up libsecret-common (0.21.4-1build3) ...
Setting up libmp3lame0:amd64 (3.100-6build1) ...
Setting up libgraphene-1.0-0:amd64 (1.10.8-3build2) ...
Setting up libvorbisenc2:amd64 (1.3.7-1build3) ...
Setting up libdvdnav4:amd64 (6.1.1-3build1) ...
Setting up fonts-unifont (1:15.1.01-1build1) ...
Setting up libaa1:amd64 (1.4p5-51.1) ...
Setting up libiec61883-0:amd64 (1.2.0-6build1) ...
Setting up libserd-0-0:amd64 (0.32.2-1) ...
Setting up libavc1394-0:amd64 (0.5.4-5build3) ...
Setting up gsettings-desktop-schemas (46.1-0ubuntu1) ...
Setting up glib-networking-services (2.80.0-1build1) ...
Setting up liblapack3:amd64 (3.12.0-3build1.1) ...
update-alternatives: using /usr/lib/x86_64-linux-gnu/lapack/liblapack.so.3 to provide /usr/lib/x86_64-linux-gnu/liblapack.so.3 (liblapack.so.3-x86_64-linux-gnu) in auto mode
Setting up libzvbi0t64:amd64 (0.2.42-2) ...
Setting up liblrdf0:amd64 (0.6.1-4build1) ...
Setting up libzbar0t64:amd64 (0.23.93-4build3) ...
Setting up libgstreamer-plugins-base1.0-0:amd64 (1.24.2-1ubuntu0.4) ...
Setting up libavutil58:amd64 (7:6.1.1-3ubuntu5) ...
Setting up libopenal1:amd64 (1:1.23.1-4build1) ...
Setting up xfonts-utils (1:7.7+6build3) ...
Setting up libsecret-1-0:amd64 (0.21.4-1build3) ...
Setting up libgstreamer-plugins-good1.0-0:amd64 (1.24.2-1ubuntu1.5) ...
Setting up libgstreamer-gl1.0-0:amd64 (1.24.2-1ubuntu0.4) ...
Setting up gstreamer1.0-plugins-base:amd64 (1.24.2-1ubuntu0.4) ...
Setting up libass9:amd64 (1:0.17.1-2build1) ...
Setting up libswresample4:amd64 (7:6.1.1-3ubuntu5) ...
Setting up libopenexr-3-1-30:amd64 (3.1.5-5.1build3) ...
Setting up libshout3:amd64 (2.4.6-1build2) ...
Setting up libgav1-1:amd64 (0.18.0-1build3) ...
Setting up libavcodec60:amd64 (7:6.1.1-3ubuntu5) ...
Setting up librubberband2:amd64 (3.3.0+dfsg-2build1) ...
Setting up libjack-jackd2-0:amd64 (1.9.21~dfsg-3ubuntu3) ...
Setting up libsord-0-0:amd64 (0.16.16-2build1) ...
Setting up xfonts-cyrillic (1:1.0.5+nmu1) ...
Setting up libpostproc57:amd64 (7:6.1.1-3ubuntu5) ...
Setting up libsratom-0-0:amd64 (0.6.16-1build1) ...
Setting up libsndfile1:amd64 (1.2.2-1ubuntu5.24.04.1) ...
Setting up liblilv-0-0:amd64 (0.24.22-1build1) ...
Setting up libinstpatch-1.0-2:amd64 (1.1.6-1build2) ...
Setting up xfonts-scalable (1:1.0.3-1.3) ...
Setting up libswscale7:amd64 (7:6.1.1-3ubuntu5) ...
Setting up libavif16:amd64 (1.0.4-1ubuntu3) ...
Setting up libpulse0:amd64 (1:16.1+dfsg1-2ubuntu10.1) ...
Setting up libavformat60:amd64 (7:6.1.1-3ubuntu5) ...
Setting up libsphinxbase3t64:amd64 (0.8+5prealpha+1-17build2) ...
Setting up libsdl2-2.0-0:amd64 (2.30.0+dfsg-1ubuntu3.1) ...
Setting up libfluidsynth3:amd64 (2.3.4-1build3) ...
Setting up libpocketsphinx3:amd64 (0.8.0+real5prealpha+1-15ubuntu5) ...
Setting up libavfilter9:amd64 (7:6.1.1-3ubuntu5) ...
Setting up gstreamer1.0-libav:amd64 (1.24.1-1build1) ...
Processing triggers for fontconfig (2.15.0-1.1ubuntu2) ...
Processing triggers for libc-bin (2.39-0ubuntu8.8) ...
Processing triggers for man-db (2.12.0-4build2) ...
Not building database; man-db/auto-update is not 'true'.
Processing triggers for libglib2.0-0t64:amd64 (2.80.0-6ubuntu3.8) ...
Setting up libgtk-4-1:amd64 (4.14.5+ds-0ubuntu0.10) ...
Setting up glib-networking:amd64 (2.80.0-1build1) ...
Setting up libsoup-3.0-0:amd64 (3.4.4-5ubuntu0.7) ...
Setting up libgssdp-1.6-0:amd64 (1.6.3-1build3) ...
Setting up gstreamer1.0-plugins-good:amd64 (1.24.2-1ubuntu1.5) ...
Setting up libgupnp-1.6-0:amd64 (1.6.6-1build3) ...
Setting up libgupnp-igd-1.6-0:amd64 (1.6.0-3build3) ...
Setting up libnice10:amd64 (0.1.21-2build3) ...
Setting up libgstreamer-plugins-bad1.0-0:amd64 (1.24.2-1ubuntu4) ...
Setting up gstreamer1.0-plugins-bad:amd64 (1.24.2-1ubuntu4) ...
Processing triggers for libc-bin (2.39-0ubuntu8.8) ...

Running kernel seems to be up-to-date.

No services need to be restarted.

No containers need to be restarted.

No user sessions are running outdated binaries.

No VM guests are running outdated hypervisor (qemu) binaries on this host.
Downloading Chrome for Testing 151.0.7922.34 (playwright chromium v1234) from https://cdn.playwright.dev/builds/cft/151.0.7922.34/linux64/chrome-linux64.zip
|                                                                                |   0% of 184.3 MiB
|■■■■■■■■                                                                        |  10% of 184.3 MiB
|■■■■■■■■■■■■■■■■                                                                |  20% of 184.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■                                                        |  30% of 184.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                                |  40% of 184.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                        |  50% of 184.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                |  60% of 184.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                        |  70% of 184.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                |  80% of 184.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■        |  90% of 184.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■| 100% of 184.3 MiB
Chrome for Testing 151.0.7922.34 (playwright chromium v1234) downloaded to /home/runner/.cache/ms-playwright/chromium-1234
Downloading FFmpeg (playwright ffmpeg v1011) from https://cdn.playwright.dev/dbazure/download/playwright/builds/ffmpeg/1011/ffmpeg-linux.zip
|                                                                                |   0% of 2.3 MiB
|■■■■■■■■                                                                        |  10% of 2.3 MiB
|■■■■■■■■■■■■■■■■                                                                |  20% of 2.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■                                                        |  30% of 2.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                                |  40% of 2.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                        |  50% of 2.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                |  60% of 2.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                        |  70% of 2.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                |  80% of 2.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■        |  90% of 2.3 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■| 100% of 2.3 MiB
FFmpeg (playwright ffmpeg v1011) downloaded to /home/runner/.cache/ms-playwright/ffmpeg-1011
Downloading Chrome Headless Shell 151.0.7922.34 (playwright chromium-headless-shell v1234) from https://cdn.playwright.dev/builds/cft/151.0.7922.34/linux64/chrome-headless-shell-linux64.zip
|                                                                                |   0% of 114.7 MiB
|■■■■■■■■                                                                        |  10% of 114.7 MiB
|■■■■■■■■■■■■■■■■                                                                |  20% of 114.7 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■                                                        |  30% of 114.7 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                                |  40% of 114.7 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                        |  50% of 114.7 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                |  60% of 114.7 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                        |  70% of 114.7 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                |  80% of 114.7 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■        |  90% of 114.7 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■| 100% of 114.7 MiB
Chrome Headless Shell 151.0.7922.34 (playwright chromium-headless-shell v1234) downloaded to /home/runner/.cache/ms-playwright/chromium_headless_shell-1234
Downloading WebKit 26.5 (playwright webkit v2336) from https://cdn.playwright.dev/dbazure/download/playwright/builds/webkit/2336/webkit-ubuntu-24.04.zip
|                                                                                |   0% of 102 MiB
|■■■■■■■■                                                                        |  10% of 102 MiB
|■■■■■■■■■■■■■■■■                                                                |  20% of 102 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■                                                        |  30% of 102 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                                |  40% of 102 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                        |  50% of 102 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                                |  60% of 102 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                        |  70% of 102 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                |  80% of 102 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■        |  90% of 102 MiB
|■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■| 100% of 102 MiB
WebKit 26.5 (playwright webkit v2336) downloaded to /home/runner/.cache/ms-playwright/webkit-2336

> lpny-supporter-crm@0.1.0 test:e2e
> playwright test


Running 2 tests using 1 worker
[WebServer] ⚠ Blocked cross-origin request to Next.js dev resource /_next/static/chunks/node_modules_next_dist_20wefz_._.js from "127.0.0.1".
[WebServer] Cross-origin access to Next.js dev resources is blocked by default for safety.
[WebServer] 
[WebServer] To allow this host in development, add it to "allowedDevOrigins" in next.config.js and restart the dev server:
[WebServer] 
[WebServer] // next.config.js
[WebServer] module.exports = {
[WebServer]   allowedDevOrigins: ['127.0.0.1'],
[WebServer] }
[WebServer] 
[WebServer] Read more: https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
[WebServer] ⚠ Blocked cross-origin request to Next.js dev resource /_next/hmr from "127.0.0.1".
[WebServer] Cross-origin access to Next.js dev resources is blocked by default for safety.
[WebServer] 
[WebServer] To allow this host in development, add it to "allowedDevOrigins" in next.config.js and restart the dev server:
[WebServer] 
[WebServer] // next.config.js
[WebServer] module.exports = {
[WebServer]   allowedDevOrigins: ['127.0.0.1'],
[WebServer] }
[WebServer] 
[WebServer] Read more: https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
··
  2 passed (16.5s)
```

