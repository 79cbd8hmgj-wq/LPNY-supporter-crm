# CI verification

Commit: `8ff4dee7e8ce7a97f76a8eddd56c94b6106da844`

- Dependency install: **success**
- App lint/typecheck/unit/build: **failure**
- Supabase CLI setup: **success**
- Database migrations/RLS: **cancelled**
- Local Supabase environment: **skipped**
- Protected CRM E2E: **skipped**

## ci-install.log
```text
npm warn deprecated whatwg-encoding@3.1.1: Use @exodus/bytes instead for a more spec-conformant and faster implementation
npm warn deprecated eslint@9.39.5: This version is no longer supported. Please see https://eslint.org/version-support for other options.

added 495 packages, and audited 496 packages in 22s

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


/home/runner/work/LPNY-supporter-crm/LPNY-supporter-crm/eslint.config.mjs
  9:1  warning  Assign array to a variable before exporting as module default  import/no-anonymous-default-export

/home/runner/work/LPNY-supporter-crm/LPNY-supporter-crm/src/app/mfa/actions.ts
  14:3  warning  '_previous' is defined but never used  @typescript-eslint/no-unused-vars
  15:3  warning  '_formData' is defined but never used  @typescript-eslint/no-unused-vars

✖ 3 problems (0 errors, 3 warnings)


> lpny-supporter-crm@0.1.0 typecheck
> tsc --noEmit

src/lib/auth/require-staff.ts(27,5): error TS2322: Type 'AuthenticatorAssuranceLevels | null' is not assignable to type '"aal1" | "aal2" | null'.
  Type 'string & {}' is not assignable to type '"aal1" | "aal2" | null'.
```

## ci-database.log
```text
5e731b050e43: Verifying Checksum
5e731b050e43: Download complete
731b962a30ac: Verifying Checksum
731b962a30ac: Download complete
0f248d4fdffd: Verifying Checksum
0f248d4fdffd: Download complete
5fc99faf3b9a: Verifying Checksum
5fc99faf3b9a: Download complete
70b9c97b39c0: Verifying Checksum
70b9c97b39c0: Download complete
7be4889067d6: Verifying Checksum
7be4889067d6: Download complete
ad8cc52b5158: Verifying Checksum
ad8cc52b5158: Download complete
597c6c618d36: Verifying Checksum
597c6c618d36: Download complete
60414ed24b30: Verifying Checksum
60414ed24b30: Download complete
c39190ba742d: Verifying Checksum
c39190ba742d: Download complete
213ec9aee27d: Pull complete
e6f31ffc071e: Pull complete
0d29c829782d: Verifying Checksum
0d29c829782d: Download complete
ba9e24d39072: Verifying Checksum
ba9e24d39072: Download complete
521c5280947c: Verifying Checksum
521c5280947c: Download complete
5404bc2cc13c: Verifying Checksum
5404bc2cc13c: Download complete
5404bc2cc13c: Verifying Checksum
5404bc2cc13c: Download complete
039e6f9f9752: Verifying Checksum
039e6f9f9752: Verifying Checksum
039e6f9f9752: Download complete
039e6f9f9752: Download complete
8f99eb9866f3: Verifying Checksum
8f99eb9866f3: Verifying Checksum
8f99eb9866f3: Download complete
8f99eb9866f3: Download complete
c0ed9f2d0e0e: Verifying Checksum
c0ed9f2d0e0e: Verifying Checksum
c0ed9f2d0e0e: Download complete
c0ed9f2d0e0e: Download complete
555d35074583: Verifying Checksum
555d35074583: 555d35074583: Download complete
Verifying Checksum
555d35074583: Download complete
23c96171f2fe: Verifying Checksum
23c96171f2fe: Download complete
4b118796ff6a: Verifying Checksum
4b118796ff6a: Download complete
662b1f44f1ee: Verifying Checksum
662b1f44f1ee: Download complete
5c18a8cdfd6b: Verifying Checksum
5c18a8cdfd6b: Download complete
7505145a46ec: Verifying Checksum
7505145a46ec: Download complete
753ab3b39a58: Verifying Checksum
753ab3b39a58: Download complete
565df2d910df: Pull complete
062e450697fa: Verifying Checksum
062e450697fa: Download complete
24c83552f646: Verifying Checksum
24c83552f646: Download complete
95faff249800: Verifying Checksum
95faff249800: Download complete
9e8e4081669a: Verifying Checksum
9e8e4081669a: Download complete
5bc6849ef973: Verifying Checksum
5bc6849ef973: Download complete
aadc1df55248: Verifying Checksum
aadc1df55248: Download complete
c350c088cde5: Verifying Checksum
c350c088cde5: Download complete
73adcb25feab: Verifying Checksum
73adcb25feab: Download complete
4f4fb700ef54: Verifying Checksum
4f4fb700ef54: Download complete
777b5f4d3eb2: Verifying Checksum
777b5f4d3eb2: Download complete
512fd86e6200: Verifying Checksum
512fd86e6200: Download complete
c0c4dc518956: Verifying Checksum
c0c4dc518956: Download complete
bcf274f2d0ac: Verifying Checksum
bcf274f2d0ac: Download complete
264588d8dd60: Verifying Checksum
264588d8dd60: Download complete
b7d0efd3fc9c: Verifying Checksum
b7d0efd3fc9c: Download complete
bcf274f2d0ac: Pull complete
Digest: sha256:5922bde07147b82b1c9d8f749e48c1e5b99ebb233f3888bb7ab65f07cf4ac82d
Status: Downloaded newer image for ghcr.io/supabase/postgrest:v16.1
ghcr.io/supabase/postgrest:v16.1
95403727e7d4: Pull complete
a70653f7a2d5: Pull complete
dc286a8aa197: Pull complete
e326d083c2c9: Pull complete
Digest: sha256:37a38e48e9338cd7e89dfeb487f37b02ebfcd9cb23111bed2d345e79d37d6dd6
Status: Downloaded newer image for ghcr.io/supabase/mailpit:v1.30.2
ghcr.io/supabase/mailpit:v1.30.2
597c6c618d36: Pull complete
039e6f9f9752: Pull complete
039e6f9f9752: Pull complete
062e450697fa: Pull complete
5404bc2cc13c: Pull complete
5404bc2cc13c: Pull complete
3b1d86731cf1: Pull complete
fd855b1da301: Pull complete
ad8aa6f5f9a9: Pull complete
Digest: sha256:362659ca70eaa75ba05bbaf963caa84c1c5afe5e8fbf0777e17b830dd5f0f60a
Status: Downloaded newer image for ghcr.io/supabase/gotrue:v2.195.0
ghcr.io/supabase/gotrue:v2.195.0
5f05fbb94ac9: Pull complete
dbd229483e61: Pull complete
f4e2bfbd8bcd: Pull complete
fff1a581b40e: Pull complete
531e3bd93090: Pull complete
814dd06d26c7: Pull complete
b87ddba4145f: Pull complete
Digest: sha256:1b53405d8680a09d6f44494b7990bf7da2ea43f84a258c59717d4539abf09f6d
Status: Downloaded newer image for ghcr.io/supabase/kong:2.8.1
14c7c40f264e: Pull complete
ghcr.io/supabase/kong:2.8.1
c39190ba742d: Pull complete
60414ed24b30: Pull complete
555d35074583: Pull complete
555d35074583: Pull complete
8f99eb9866f3: Pull complete
8f99eb9866f3: Pull complete
c0ed9f2d0e0e: c0ed9f2d0e0e: Pull complete
Pull complete
4b118796ff6a: Pull complete
23c96171f2fe: Pull complete
7e1afeac9515: Pull complete
521c5280947c: Pull complete
7dd51689e5de: Pull complete
0d29c829782d: Pull complete
753ab3b39a58: Pull complete
aadc1df55248: Pull complete
3f609ae12598: 4f4fb700ef54: Pull complete
Pull complete
c80645774acf: Pull complete
5c18a8cdfd6b: Pull complete
5e731b050e43: Pull complete
7505145a46ec: Pull complete
Digest: sha256:cef71ba901751dcc242cc685cf13786935ea8926820fb342f23bb0fbef77de5a
Status: Downloaded newer image for ghcr.io/supabase/postgres-meta:v0.98.0
ghcr.io/supabase/postgres-meta:v0.98.0
b7d0efd3fc9c: Pull complete
24c83552f646: Pull complete
95faff249800: Pull complete
9e8e4081669a: Pull complete
5bc6849ef973: Pull complete
73adcb25feab: Pull complete
c0c4dc518956: Pull complete
512fd86e6200: Pull complete
0f248d4fdffd: Pull complete
731b962a30ac: Pull complete
```

