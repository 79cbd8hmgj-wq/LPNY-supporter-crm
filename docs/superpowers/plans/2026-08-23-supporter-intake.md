# Supporter Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public `/get-involved` flow that atomically creates or enriches a CRM supporter and queues organizer follow-up.

**Architecture:** A mobile-first Next.js form posts JSON to a public route handler. Server-only validation/geography code normalizes the submission, resolves New York county data locally, and invokes a service-role-only PostgreSQL RPC that performs matching, history writes, consent writes, and follow-up creation in one transaction.

**Tech Stack:** Next.js 16.3.2, React 19.2.8, TypeScript 5.9, Zod 4, Supabase/PostgreSQL, pgTAP, Vitest, Playwright, `zipcodes-us` 1.1.3.

**Spec:** `docs/superpowers/specs/2026-08-23-supporter-intake-design.md`

## Global Constraints

- Public browsers never receive the Supabase service-role key.
- The endpoint never reveals whether a supporter already existed.
- Use `zipcodes-us` 1.1.3 locally; no runtime geography API call.
- Unchecked consent boxes do not create opt-out events.
- An ambiguous phone match creates a duplicate candidate instead of silently merging people.
- Initial follow-up is due 24 hours after intake and is county-queued when county is known, statewide otherwise.
- No specific organizer auto-assignment in this increment.
- All database mutations for one accepted intake occur atomically through one service-role-only RPC.

---

### Task 1: Server-only intake infrastructure and dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Modify: `src/lib/env.ts`
- Create: `src/lib/supabase/admin.ts`
- Test: `tests/intake/env.test.ts`

**Interfaces:**
- Produces: `getServerEnv(): { SUPABASE_SERVICE_ROLE_KEY: string }`
- Produces: `createAdminSupabaseClient(): SupabaseClient<Database>`

- [ ] **Step 1: Write the failing server-env test**

```ts
import { describe, expect, it } from "vitest";
import { getServerEnv } from "@/lib/env";

describe("getServerEnv", () => {
  it("rejects a missing service-role key at call time", () => {
    const previous = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => getServerEnv()).toThrow();
    if (previous) process.env.SUPABASE_SERVICE_ROLE_KEY = previous;
  });
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- tests/intake/env.test.ts`
Expected: FAIL because `getServerEnv` does not exist.

- [ ] **Step 3: Add the dependency and server env accessor**

Add `"zipcodes-us": "1.1.3"` to dependencies and its npm lock entry. Add `SUPABASE_SERVICE_ROLE_KEY=replace-with-local-service-role-key` to `.env.example`.

Implement:

```ts
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export function getServerEnv() {
  return serverEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
```

Create `src/lib/supabase/admin.ts` using `createClient` with `auth: { persistSession: false, autoRefreshToken: false }`.

- [ ] **Step 4: Run the focused test**

Run: `npm test -- tests/intake/env.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example src/lib/env.ts src/lib/supabase/admin.ts tests/intake/env.test.ts
git commit -m "feat: add server-only intake infrastructure"
```

### Task 2: Intake validation, normalization, and ZIP geography

**Files:**
- Create: `src/lib/intake/schema.ts`
- Create: `src/lib/intake/normalize.ts`
- Create: `src/lib/intake/geography.ts`
- Test: `tests/intake/schema.test.ts`
- Test: `tests/intake/normalize.test.ts`
- Test: `tests/intake/geography.test.ts`

**Interfaces:**
- Produces: `getInvolvedInputSchema`
- Produces: `normalizeName(value: string): string`
- Produces: `normalizeEmail(value?: string): string | null`
- Produces: `normalizePhone(value?: string): string | null`
- Produces: `resolveZipGeography(zipCode: string): { zipCode: string; municipality: string | null; countyName: string | null; isNewYork: boolean }`

- [ ] **Step 1: Write failing validation tests**

Cover required names/ZIP, email-or-phone requirement, maximum lengths, unique allow-listed interests, and honeypot acceptance.

- [ ] **Step 2: Write failing normalization tests**

Examples:

```ts
expect(normalizeName("  Mary   Ann ")).toBe("Mary Ann");
expect(normalizeEmail(" USER@Example.COM ")).toBe("user@example.com");
expect(normalizePhone("+1 (518) 555-1212")).toBe("5185551212");
```

- [ ] **Step 3: Write failing geography tests**

```ts
expect(resolveZipGeography("10001")).toMatchObject({ isNewYork: true, countyName: "New York" });
expect(resolveZipGeography("90210")).toMatchObject({ isNewYork: false, countyName: null });
expect(() => resolveZipGeography("00000")).toThrow();
```

- [ ] **Step 4: Implement schema/normalization/geography**

Use the nine existing interest slugs exactly. `resolveZipGeography` uses `zipcodes.find(zipCode)`, rejects `isValid === false`, and returns county only when `stateCode === "NY"`.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- tests/intake/schema.test.ts tests/intake/normalize.test.ts tests/intake/geography.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/intake tests/intake
git commit -m "feat: validate and normalize supporter intake"
```

### Task 3: Atomic PostgreSQL intake RPC

**Files:**
- Create: `supabase/migrations/202608230005_public_supporter_intake.sql`
- Create: `supabase/tests/supporter_intake.test.sql`
- Modify: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Produces RPC: `public.process_get_involved_intake(p_first_name text, p_last_name text, p_email text, p_normalized_email text, p_phone text, p_normalized_phone text, p_zip_code text, p_county_name text, p_municipality text, p_interest_slugs text[], p_email_opt_in boolean, p_phone_opt_in boolean) returns uuid`

- [ ] **Step 1: Write pgTAP tests before the migration**

Tests cover new person creation, email reuse, phone+last-name reuse, ambiguous phone duplicate candidate, source/activity/relationship/interests, consent behavior, one open task, county/statewide queue, and denied execute privilege for `anon`/`authenticated`.

- [ ] **Step 2: Run database tests and verify failure**

Run: `supabase db reset && supabase test db`
Expected: FAIL because the RPC does not exist.

- [ ] **Step 3: Implement the RPC migration**

The function must:
1. resolve the seeded source and Supporter relationship IDs;
2. resolve county by case-insensitive name;
3. match email first, then phone+last name;
4. insert or enrich the person;
5. create duplicate candidate for ambiguous phone on a new person;
6. upsert supporter relationship and interests;
7. insert one source row per accepted submission;
8. insert only explicit consent opt-ins;
9. insert `form_submitted` activity;
10. create an `initial_follow_up` task only when no open one exists;
11. return the person UUID.

End the migration with:

```sql
revoke all on function public.process_get_involved_intake(...) from public, anon, authenticated;
grant execute on function public.process_get_involved_intake(...) to service_role;
```

- [ ] **Step 4: Add the RPC typing**

Add `process_get_involved_intake` under `Database["public"]["Functions"]` with exact argument names and `Returns: string`.

- [ ] **Step 5: Run database tests**

Run: `supabase db reset && supabase test db`
Expected: all pgTAP suites PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/202608230005_public_supporter_intake.sql supabase/tests/supporter_intake.test.sql src/lib/supabase/database.types.ts
git commit -m "feat: add atomic supporter intake RPC"
```

### Task 4: Intake service and public API route

**Files:**
- Create: `src/lib/intake/service.ts`
- Create: `src/app/api/intake/get-involved/route.ts`
- Test: `tests/intake/service.test.ts`
- Test: `tests/intake/route.test.ts`

**Interfaces:**
- Produces: `processGetInvolvedSubmission(input: GetInvolvedInput): Promise<void>`
- Produces HTTP: `POST /api/intake/get-involved`

- [ ] **Step 1: Write service tests**

Mock the admin client RPC and assert normalized values, resolved county/municipality, interest slugs, and consent flags are passed under the exact RPC argument names.

- [ ] **Step 2: Write route tests**

Assert:
- invalid input -> 400 without service call;
- honeypot -> 200 without service call;
- valid input -> generic 200 `{ ok: true }`;
- service failure -> generic 500 without CRM identifiers.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `npm test -- tests/intake/service.test.ts tests/intake/route.test.ts`
Expected: FAIL because service/route do not exist.

- [ ] **Step 4: Implement service and route**

The route parses JSON, applies Zod, handles the honeypot, calls the service, and never returns the person ID or match result.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- tests/intake/service.test.ts tests/intake/route.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/intake/service.ts src/app/api/intake/get-involved/route.ts tests/intake
git commit -m "feat: add public supporter intake endpoint"
```

### Task 5: Mobile-first `/get-involved` experience

**Files:**
- Create: `src/app/get-involved/page.tsx`
- Create: `src/app/get-involved/get-involved-form.tsx`
- Modify: `src/app/page.tsx`
- Test: `tests/e2e/get-involved.spec.ts`

**Interfaces:**
- Consumes: `POST /api/intake/get-involved`
- Produces: public route `/get-involved`

- [ ] **Step 1: Add failing Playwright assertions**

Cover page render, missing-contact validation, successful submission, and success state on both configured browsers.

- [ ] **Step 2: Implement the form**

Use labeled native inputs, `inputMode`/`autoComplete`, touch-sized controls, optional interest checkboxes, conditional consent labels, disabled submitting state, inline field errors, and a non-enumerating success message.

- [ ] **Step 3: Add homepage entry point**

Add a clear `Get involved` link while retaining `Staff sign in` as the internal path.

- [ ] **Step 4: Run browser tests against local Supabase**

Run: `npm run test:e2e`
Expected: protected CRM tests and new intake tests PASS in Chromium and WebKit.

- [ ] **Step 5: Commit**

```bash
git add src/app/get-involved src/app/page.tsx tests/e2e/get-involved.spec.ts
git commit -m "feat: add public get involved form"
```

### Task 6: CI wiring and full verification

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`

**Interfaces:**
- CI must provide `SUPABASE_SERVICE_ROLE_KEY` to the E2E server after local Supabase starts.

- [ ] **Step 1: Export the local service-role key**

Extend the existing `supabase status -o env` parsing to include `SERVICE_ROLE_KEY`, then write:

```bash
echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY" >> "$GITHUB_ENV"
```

- [ ] **Step 2: Document local intake environment and commands**

README must list the service-role env variable and the `/get-involved` development path without ever including a real secret.

- [ ] **Step 3: Run the complete verification chain**

Run:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high
supabase db reset
supabase test db
npm run test:e2e
```

Expected: every command exits 0.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml README.md
git commit -m "ci: verify supporter intake end to end"
```

- [ ] **Step 5: Open a draft PR against `main`**

Title: `Build public supporter intake flow`

Body summarizes public form, server isolation, dedupe behavior, consent/source/activity history, county/statewide queueing, and the full verification chain.
