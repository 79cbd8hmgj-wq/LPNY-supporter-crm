# Reporting and Source Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Phase 5 by turning the existing organizer dashboard into a scoped reporting surface with period-aware operational metrics and source conversion reporting.

**Architecture:** Keep PostgreSQL Row-Level Security as the access boundary and query only existing RLS-protected CRM tables through the authenticated Supabase client. Move pure reporting math into a focused `src/lib/crm/reporting.ts` module, keep queue loading in `dashboard.ts`, and render the additional metrics inside the existing `/crm` dashboard instead of creating a parallel reporting application.

**Tech Stack:** Next.js 16, TypeScript, Supabase/PostgreSQL with RLS, Vitest, Playwright.

**Spec:** `2026-08-23-supporter-crm-v1-design.md` and `docs/superpowers/plans/2026-08-23-supporter-crm-v1-roadmap.md`

## Global Constraints

- Next.js responsive web application.
- Supabase-hosted PostgreSQL and Supabase Auth.
- MFA for internal users.
- Row-Level Security is the authoritative access boundary.
- County Organizer access is limited to explicitly assigned counties.
- Volunteer/Staff access is limited to explicitly assigned contacts/work.
- Production PII is never used as development/test data.
- No new mass messaging, donation, event-registration, Atlas, scoring, AI-recommendation, native-app, or custom-report-builder scope.
- Reporting must be based only on rows visible to the authenticated staff user through existing RLS policies.
- Archived contacts do not contribute to active-contact metrics.
- Duplicate source associations for the same person/source pair count once in source counts and source-performance rows.

---

### Task 1: Add period-aware pure reporting aggregates

**Files:**
- Create: `src/lib/crm/reporting.ts`
- Create: `tests/crm/reporting.test.ts`

**Interfaces:**
- Produces: `ReportingPeriod = "7d" | "30d" | "90d" | "all"`
- Produces: `parseReportingPeriod(value: string | string[] | undefined): ReportingPeriod`
- Produces: `reportingPeriodStart(period: ReportingPeriod, now: Date): Date | null`
- Produces: `aggregateReporting(input): ReportingSummary`
- Produces: `aggregateSourcePerformance(input): SourcePerformanceRow[]`

- [ ] **Step 1: Write failing period tests**

Add Vitest coverage proving unsupported/multi-valued query input falls back to `30d`, recognized values survive unchanged, and `7d`/`30d`/`90d` start dates are computed from the supplied `now` while `all` returns `null`.

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
npm test -- --run tests/crm/reporting.test.ts
```

Expected: FAIL because `@/lib/crm/reporting` does not exist.

- [ ] **Step 3: Write failing aggregate tests**

Use synthetic scoped rows only. Cover:

```ts
expect(summary.totalActiveContacts).toBe(5);
expect(summary.newContactsInPeriod).toBe(3);
expect(summary.overdueTasks).toBe(2);
expect(summary.unassignedContacts).toBe(1);
expect(summary.followUpEligibleTasks).toBe(4);
expect(summary.followUpCompletedTasks).toBe(3);
expect(summary.followUpCompletionRate).toBe(75);
expect(summary.byRelationship).toEqual([
  { label: "Supporter", count: 4 },
  { label: "Volunteer", count: 2 },
]);
expect(summary.byInterest).toEqual([
  { label: "Local activism", count: 3 },
  { label: "Volunteering", count: 2 },
]);
```

Task-rate semantics: include non-cancelled tasks created during the selected reporting period; completed tasks count in the numerator. `all` includes all non-cancelled visible tasks.

- [ ] **Step 4: Write failing source-performance tests**

For each source, count distinct visible active people associated with that source during the selected period. Define the cumulative funnel as:

```text
Signups   = distinct people attributed to the source
Contacted = people whose current stage is contacted OR engaged
Engaged   = people whose current stage is engaged
Volunteer = people currently carrying the `volunteer` relationship
```

Assert duplicate `person_sources` rows do not inflate a source. Assert rows are ordered by signup count descending, then source name. Assert percentage fields are whole-number percentages of signups, with zero when signups are zero.

- [ ] **Step 5: Implement the minimal pure reporting module**

Create focused exported types for reporting rows and pure helper functions. Do not access Supabase from this file. Normalize percentages with:

```ts
function percent(part: number, whole: number) {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}
```

Use distinct `Set` keys for person/source associations.

- [ ] **Step 6: Run focused tests GREEN**

Run:

```bash
npm test -- --run tests/crm/reporting.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/crm/reporting.ts tests/crm/reporting.test.ts
git commit -m "feat: add scoped reporting aggregates"
```

---

### Task 2: Wire complete scoped reporting data into the dashboard loader

**Files:**
- Modify: `src/lib/crm/dashboard.ts`
- Modify: `tests/crm/dashboard.test.ts`

**Interfaces:**
- Consumes: `ReportingPeriod`, `reportingPeriodStart`, `aggregateReporting`, `aggregateSourcePerformance`
- Changes: `loadDashboardData(now?: Date, period?: ReportingPeriod): Promise<DashboardData>`
- Extends: `DashboardData.reporting`

- [ ] **Step 1: Extend the dashboard unit fixtures RED**

Update the dashboard aggregate fixture to include relationships and interests and assert the existing count behavior remains deterministic. Add a regression assertion that duplicate source associations for one person/source pair count once.

- [ ] **Step 2: Extend `DashboardData`**

Add:

```ts
reporting: {
  period: ReportingPeriod;
  periodStartIso: string | null;
  totalActiveContacts: number;
  newContactsInPeriod: number;
  overdueTasks: number;
  unassignedContacts: number;
  followUpEligibleTasks: number;
  followUpCompletedTasks: number;
  followUpCompletionRate: number;
  byStage: CountRow[];
  byCounty: CountRow[];
  bySource: CountRow[];
  byRelationship: CountRow[];
  byInterest: CountRow[];
  sourcePerformance: SourcePerformanceRow[];
};
```

Keep the existing queue payloads unchanged.

- [ ] **Step 3: Query the existing RLS-protected tables**

In `loadDashboardData`, fetch only columns required for reporting from:

```text
people
counties
person_sources
sources
person_relationships
relationship_types
person_interests
interests
tasks
```

All queries must use the authenticated server Supabase client. Do not use the service-role client. Filter archived people out of active-contact metrics. Pass only RLS-visible rows into the pure reporting functions.

- [ ] **Step 4: Preserve queue previews but compute full metric counts separately**

The top-level overdue and unassigned metrics must use the complete visible datasets, not the existing `limit(8)` queue previews. Preserve the previews for action-oriented cards.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm test -- --run tests/crm/dashboard.test.ts tests/crm/reporting.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/crm/dashboard.ts tests/crm/dashboard.test.ts
git commit -m "feat: load complete dashboard reporting data"
```

---

### Task 3: Add the period selector and reporting/source-performance UI

**Files:**
- Modify: `src/app/crm/page.tsx`
- Modify: `src/app/crm/dashboard-sections.tsx`
- Create: `tests/crm/dashboard-sections.test.tsx`

**Interfaces:**
- Consumes: `parseReportingPeriod` and `DashboardData.reporting`
- Keeps route: `/crm`
- Adds query contract: `/crm?period=7d|30d|90d|all`

- [ ] **Step 1: Write the UI test RED**

Render `DashboardSections` with a synthetic `DashboardData` value and assert the reporting surface includes:

```text
Active contacts
New contacts
Follow-up completion
Overdue tasks
Unassigned contacts
By engagement stage
By county
By source
By relationship
By interest
Source performance
```

Assert a source row exposes Signups, Contacted, Engaged, Volunteer and percentage conversion values.

- [ ] **Step 2: Parse the reporting period in the server page**

Read `searchParams.period`, normalize it with `parseReportingPeriod`, and call `loadDashboardData(new Date(), period)`.

- [ ] **Step 3: Add a server-rendered period selector**

Use normal links so no client state is required:

```text
7 days | 30 days | 90 days | All time
```

The active period must have an accessible marker such as `aria-current="page"`.

- [ ] **Step 4: Replace preview-only KPI labels with complete reporting metrics**

Top KPI cards should display the full reporting values rather than queue lengths. Keep the existing queue sections below them for operational work.

- [ ] **Step 5: Add relationship and interest breakdowns**

Reuse the existing count-breakdown visual pattern. Do not add chart libraries in v1.

- [ ] **Step 6: Add source-performance table/cards responsive to mobile**

Columns on wider screens:

```text
Source | Signups | Contacted | Engaged | Volunteers
```

Display conversion percentages beneath the downstream counts. On narrow screens, allow horizontal overflow or stack rows without hiding any metric.

- [ ] **Step 7: Run focused tests**

Run:

```bash
npm test -- --run tests/crm/dashboard-sections.test.tsx tests/crm/dashboard.test.ts tests/crm/reporting.test.ts
npm run lint
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/crm/page.tsx src/app/crm/dashboard-sections.tsx tests/crm/dashboard-sections.test.tsx
git commit -m "feat: add dashboard reporting and source performance"
```

---

### Task 4: Add Phase 5 acceptance coverage and documentation

**Files:**
- Modify: `tests/e2e/organizer-workflow.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Verifies existing role-scoped `/crm` route.
- No new privileged endpoint is introduced.

- [ ] **Step 1: Extend the organizer acceptance test RED**

After the organizer reaches the dashboard with seeded in-scope/out-of-scope supporters, assert the reporting surface is visible and that county/source reporting does not expose the out-of-scope county fixture.

Add an assertion that switching the period link updates the dashboard URL and leaves the operational queues usable.

- [ ] **Step 2: Update README**

Document that the organizer dashboard now includes period-aware scoped reporting, relationship/interest counts, full overdue/unassigned metrics, follow-up completion, and source conversion reporting. State that metrics inherit database RLS scope.

- [ ] **Step 3: Run the complete local verification sequence available in CI**

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high
npm run supabase:reset
npm run test:db
npm run test:e2e
```

Expected: all checks pass.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/organizer-workflow.spec.ts README.md
git commit -m "test: verify phase 5 reporting workflow"
```

---

### Task 5: Phase 5 branch verification and merge gate

**Files:**
- No product files unless verification exposes a defect.

- [ ] **Step 1: Run branch CI on the exact head SHA**

Require success for dependency install, lint, typecheck, all unit tests, production build, production dependency audit, Supabase startup/reset, migrations, database/RLS tests, Chromium/mobile-WebKit E2E, and cleanup.

- [ ] **Step 2: Open a Phase 5 PR against `main`**

PR summary must describe the reporting-period contract, RLS-scoped aggregates, source funnel semantics, and test evidence.

- [ ] **Step 3: Require independent PR CI**

Do not merge on branch CI alone.

- [ ] **Step 4: Merge with expected-head protection**

Use the exact verified PR head SHA so GitHub rejects the merge if the branch moved.

- [ ] **Step 5: Require final `main` CI**

Phase 5 is complete only after the push-triggered CI on the merge commit passes the same full pipeline.
