import { createClient } from "@supabase/supabase-js";

const EXPECTED_STAGING_HOST = "jcuxbutwcmgohyikpvcq.supabase.co";
const TEST_EMAIL_SUFFIX = "@example.test";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for Staging E2E cleanup.`);
  }
  return value;
}

function assertSuccess(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

async function deleteByIds(client, table, column, ids, label) {
  if (ids.length === 0) return;
  const result = await client.from(table).delete().in(column, ids);
  assertSuccess(result, label);
}

const targetEnvironment = requiredEnv("PLAYWRIGHT_TARGET_ENV").toLowerCase();
if (targetEnvironment !== "staging") {
  throw new Error("Fixture cleanup is allowed only for the staging E2E target.");
}

const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseHost = new URL(supabaseUrl).hostname;
if (supabaseHost !== EXPECTED_STAGING_HOST) {
  throw new Error(
    `Refusing fixture cleanup for ${supabaseHost}; expected ${EXPECTED_STAGING_HOST}.`,
  );
}

const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const testAuthUsers = [];
for (let page = 1; ; page += 1) {
  const result = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  const users = assertSuccess(result, "List Auth users")?.users ?? [];
  testAuthUsers.push(
    ...users.filter((user) =>
      user.email?.toLowerCase().endsWith(TEST_EMAIL_SUFFIX),
    ),
  );
  if (users.length < 1000) break;
}

const testAuthUserIds = testAuthUsers.map((user) => user.id);

const testStaff =
  testAuthUserIds.length === 0
    ? []
    : assertSuccess(
        await admin
          .from("staff_users")
          .select("id, auth_user_id")
          .in("auth_user_id", testAuthUserIds),
        "Load test staff",
      ) ?? [];

const testPeople =
  assertSuccess(
    await admin
      .from("people")
      .select("id, email, merged_into_person_id")
      .ilike("email", `%${TEST_EMAIL_SUFFIX}`),
    "Load test people",
  ) ?? [];

const testStaffIds = testStaff.map((staff) => staff.id);
const testPersonIds = testPeople.map((person) => person.id);

if (testPersonIds.length > 0) {
  const mergeReferences =
    assertSuccess(
      await admin
        .from("people")
        .select("id, email, merged_into_person_id")
        .in("merged_into_person_id", testPersonIds),
      "Check merge references",
    ) ?? [];

  const unexpectedReferences = mergeReferences.filter(
    (person) => !testPersonIds.includes(person.id),
  );
  if (unexpectedReferences.length > 0) {
    throw new Error(
      "Refusing cleanup because a non-test person is merged into a test person.",
    );
  }

  assertSuccess(
    await admin
      .from("people")
      .update({ merged_into_person_id: null })
      .in("id", testPersonIds),
    "Clear test merge references",
  );
}

if (testStaffIds.length > 0) {
  await deleteByIds(
    admin,
    "admin_audit_events",
    "actor_staff_user_id",
    testStaffIds,
    "Delete test audit events",
  );
  await deleteByIds(
    admin,
    "committee_terms",
    "staff_user_id",
    testStaffIds,
    "Delete test committee terms",
  );
  await deleteByIds(
    admin,
    "crm_events",
    "created_by_staff_user_id",
    testStaffIds,
    "Delete test events",
  );
  await deleteByIds(
    admin,
    "internal_notes",
    "author_staff_user_id",
    testStaffIds,
    "Delete test notes",
  );
  await deleteByIds(
    admin,
    "tasks",
    "created_by_staff_user_id",
    testStaffIds,
    "Delete tasks created by test staff",
  );
  await deleteByIds(
    admin,
    "tasks",
    "assignee_staff_user_id",
    testStaffIds,
    "Delete tasks assigned to test staff",
  );
  await deleteByIds(
    admin,
    "activities",
    "actor_staff_user_id",
    testStaffIds,
    "Delete activities created by test staff",
  );
  await deleteByIds(
    admin,
    "tags",
    "created_by_staff_user_id",
    testStaffIds,
    "Delete tags created by test staff",
  );
}

await deleteByIds(
  admin,
  "people",
  "id",
  testPersonIds,
  "Delete test people",
);
await deleteByIds(
  admin,
  "staff_users",
  "id",
  testStaffIds,
  "Delete test staff",
);

for (const user of testAuthUsers) {
  const result = await admin.auth.admin.deleteUser(user.id);
  assertSuccess(result, `Delete Auth user ${user.id}`);
}

console.log(
  `Staging E2E cleanup removed ${testPersonIds.length} people, ${testStaffIds.length} staff users, and ${testAuthUserIds.length} Auth users.`,
);
