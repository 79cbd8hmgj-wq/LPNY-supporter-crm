import { randomUUID } from "node:crypto";
import { expect, test, type TestInfo } from "@playwright/test";
import {
  loginWithMfa,
  provisionAdminStaff,
  provisionStaff,
  type BrowserStaffRole,
} from "./support/staff-session";

async function createPerson(
  admin: Awaited<ReturnType<typeof provisionAdminStaff>>["admin"],
  suffix: string,
  label: string,
) {
  const email = `${label.toLowerCase()}-${suffix}@example.test`;
  const { data, error } = await admin
    .from("people")
    .insert({
      first_name: label,
      last_name: `Browser ${suffix.slice(-8)}`,
      email,
      normalized_email: email.toLowerCase(),
      zip_code: "12207",
      engagement_stage: "new",
    })
    .select("id")
    .single();
  expect(error).toBeNull();
  expect(data?.id).toBeTruthy();
  return { id: data!.id, email };
}

async function createDuplicateCandidate(
  admin: Awaited<ReturnType<typeof provisionAdminStaff>>["admin"],
  personAId: string,
  personBId: string,
  reason: string,
  confidence: number,
) {
  const { data, error } = await admin
    .from("duplicate_candidates")
    .insert({
      person_a_id: personAId,
      person_b_id: personBId,
      reason,
      confidence,
    })
    .select("id")
    .single();
  expect(error).toBeNull();
  expect(data?.id).toBeTruthy();
  return data!.id;
}

async function expectStaffRole(
  admin: Awaited<ReturnType<typeof provisionAdminStaff>>["admin"],
  staffUserId: string,
  role: BrowserStaffRole,
) {
  await expect.poll(async () => {
    const { data } = await admin
      .from("staff_users")
      .select("role")
      .eq("id", staffUserId)
      .single();
    return data?.role;
  }).toBe(role);
}

async function provisionRole(testInfo: TestInfo, role: BrowserStaffRole) {
  return provisionStaff(testInfo, `admin-boundary-${role}`, role);
}

test("Admin completes the administration data-operations loop", async ({ page }, testInfo) => {
  test.setTimeout(90_000);

  const adminStaff = await provisionAdminStaff(testInfo, "admin-operations");
  const targetStaff = await provisionStaff(testInfo, "access-target", "volunteer_staff");
  const unique = `${testInfo.project.name}-${randomUUID().slice(0, 8)}`.toLowerCase();

  const keepA = await createPerson(adminStaff.admin, unique, "KeepA");
  const keepB = await createPerson(adminStaff.admin, unique, "KeepB");
  const mergeA = await createPerson(adminStaff.admin, unique, "MergeA");
  const mergeB = await createPerson(adminStaff.admin, unique, "MergeB");
  const keepReason = `Browser keep separate ${unique}`;
  const mergeReason = `Browser merge ${unique}`;
  const keepCandidateId = await createDuplicateCandidate(
    adminStaff.admin,
    keepA.id,
    keepB.id,
    keepReason,
    0.91,
  );
  const mergeCandidateId = await createDuplicateCandidate(
    adminStaff.admin,
    mergeA.id,
    mergeB.id,
    mergeReason,
    0.97,
  );

  await loginWithMfa(page, adminStaff.email, adminStaff.password);

  await page.goto("/crm/admin/staff");
  const staffCard = page.getByRole("article").filter({ hasText: targetStaff.displayName });
  await expect(staffCard).toBeVisible();
  await staffCard.getByLabel("Role").selectOption("state_organizer");
  await staffCard.getByRole("button", { name: "Save access" }).click();
  await expect(staffCard.getByRole("status")).toHaveText("Staff access updated.");
  await page.waitForLoadState("networkidle");
  await expectStaffRole(adminStaff.admin, targetStaff.staffUserId, "state_organizer");

  const tagName = `Acceptance ${unique}`;
  await page.goto("/crm/admin/taxonomies");
  const newTagInput = page.getByLabel("New tag");
  await newTagInput.fill(tagName);
  await expect(newTagInput).toHaveValue(tagName);
  await newTagInput.blur();
  await page.getByRole("button", { name: "Add tag" }).click();
  await expect.poll(async () => {
    const { data } = await adminStaff.admin
      .from("tags")
      .select("id, active")
      .eq("name", tagName)
      .maybeSingle();
    return Boolean(data?.id) && data?.active === true;
  }, { timeout: 15_000 }).toBe(true);
  await page.reload();
  const tagInput = page.locator(`input[value="${tagName}"]`);
  await expect(tagInput).toBeVisible();
  const tagCard = page.getByRole("article").filter({ has: tagInput });
  await tagCard.getByLabel("Active in CRM selectors").uncheck();
  await tagCard.getByRole("button", { name: "Save tag" }).click();
  await expect.poll(async () => {
    const { data } = await adminStaff.admin
      .from("tags")
      .select("active")
      .eq("name", tagName)
      .single();
    return data?.active;
  }).toBe(false);
  await expect(tagCard.getByText("Inactive", { exact: true })).toBeVisible();

  await page.goto("/crm/admin/duplicates");
  const keepCard = page.getByRole("article").filter({ hasText: keepReason });
  await expect(keepCard).toBeVisible();
  await keepCard.getByRole("button", { name: "Keep separate" }).click();
  await expect.poll(async () => {
    const { data } = await adminStaff.admin
      .from("duplicate_candidates")
      .select("status")
      .eq("id", keepCandidateId)
      .single();
    return data?.status;
  }).toBe("kept_separate");

  const mergeCard = page.getByRole("article").filter({ hasText: mergeReason });
  await expect(mergeCard).toBeVisible();
  await mergeCard.getByRole("radio").first().check();
  page.once("dialog", (dialog) => void dialog.accept());
  await mergeCard.getByRole("button", { name: "Merge selected records" }).click();
  await expect.poll(async () => {
    const { data } = await adminStaff.admin
      .from("duplicate_candidates")
      .select("status")
      .eq("id", mergeCandidateId)
      .single();
    return data?.status;
  }).toBe("merged");
  await expect.poll(async () => {
    const { data } = await adminStaff.admin
      .from("people")
      .select("merged_into_person_id, archived_at")
      .eq("id", mergeB.id)
      .single();
    return Boolean(data?.archived_at) && data?.merged_into_person_id === mergeA.id;
  }).toBe(true);

  const importEmail = `browser-import-${unique}@example.test`;
  const csv = [
    "first_name,last_name,email,zip",
    `Imported,Supporter,${importEmail},12207`,
  ].join("\r\n");

  await page.goto("/crm/admin/import");
  await page.locator('input[type="file"]').setInputFiles({
    name: `supporters-${unique}.csv`,
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await page.getByRole("button", { name: "Preview import" }).click();
  await expect(page.getByRole("heading", { name: "3. Review rows" })).toBeVisible();
  await expect(page.getByText("New supporter", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Apply import" }).click();
  await expect(page.getByText("CSV import applied successfully.")).toBeVisible();

  let importedPersonId = "";
  await expect.poll(async () => {
    const { data } = await adminStaff.admin
      .from("people")
      .select("id")
      .eq("normalized_email", importEmail)
      .maybeSingle();
    importedPersonId = data?.id ?? "";
    return importedPersonId.length > 0;
  }).toBe(true);

  const secretNote = `private-note-${unique}`;
  const { error: noteError } = await adminStaff.admin.from("internal_notes").insert({
    person_id: importedPersonId,
    author_staff_user_id: adminStaff.staffUserId,
    body: secretNote,
  });
  expect(noteError).toBeNull();

  await page.goto(`/crm/people?q=${encodeURIComponent(importEmail)}`);
  await expect(page.getByText(importEmail)).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  expect(stream).toBeTruthy();
  let exportedCsv = "";
  for await (const chunk of stream!) exportedCsv += chunk.toString();
  expect(exportedCsv).toContain("person_id,first_name,last_name,email,phone,zip_code,county,municipality,engagement_stage,assigned_organizer,relationships,interests,tags,do_not_contact,created_at,last_activity_at");
  expect(exportedCsv).toContain(importEmail);
  expect(exportedCsv).not.toContain(secretNote);

  await page.goto("/crm/admin/audit");
  for (const action of [
    "Staff Role Changed",
    "Taxonomy Created",
    "Taxonomy Updated",
    "Duplicate Kept Separate",
    "Duplicate Merged",
    "CSV Import Applied",
    "People CSV Exported",
  ]) {
    await expect(page.getByRole("heading", { name: action }).first()).toBeVisible();
  }
  await expect(page.getByText(importEmail)).toHaveCount(0);
});

test("State Organizer receives only statewide taxonomy and duplicate administration", async ({ page }, testInfo) => {
  const staff = await provisionRole(testInfo, "state_organizer");
  await loginWithMfa(page, staff.email, staff.password);

  await page.goto("/crm/admin");
  await expect(page.getByRole("link", { name: /Sources, tags, and interests/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Duplicate review/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Staff access/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /CSV import/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Audit log/ })).toHaveCount(0);

  for (const restrictedPath of [
    "/crm/admin/staff",
    "/crm/admin/import",
    "/crm/admin/audit",
    "/crm/admin/export",
  ]) {
    await page.goto(restrictedPath);
    await expect(page).toHaveURL(/\/crm$/);
  }

  await page.goto("/crm/people");
  await expect(page.getByRole("link", { name: "Export CSV" })).toHaveCount(0);
});

for (const role of ["county_organizer", "volunteer_staff"] as const) {
  test(`${role} cannot enter administration or export supporter data`, async ({ page }, testInfo) => {
    const staff = await provisionRole(testInfo, role);
    await loginWithMfa(page, staff.email, staff.password);

    for (const restrictedPath of [
      "/crm/admin",
      "/crm/admin/taxonomies",
      "/crm/admin/duplicates",
      "/crm/admin/staff",
      "/crm/admin/import",
      "/crm/admin/audit",
      "/crm/admin/export",
    ]) {
      await page.goto(restrictedPath);
      await expect(page).toHaveURL(/\/crm$/);
    }

    await page.goto("/crm/people");
    await expect(page.getByRole("link", { name: "Export CSV" })).toHaveCount(0);
  });
}
