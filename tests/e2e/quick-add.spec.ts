import { expect, test } from "@playwright/test";
import { loginWithMfa, provisionAdminStaff } from "./support/staff-session";

test("organizer can Quick Add a supporter and sees duplicate warnings", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const { admin, email, password, suffix } = await provisionAdminStaff(testInfo, "quick-add-staff");
  const supporterEmail = `quick-add-supporter-${suffix}@example.test`;
  const supporterPhone = `518555${Math.floor(1000 + Math.random() * 8999)}`;
  const supporterFirstName = testInfo.project.name === "webkit-mobile" ? "WebKit" : "Chromium";
  const supporterLastName = `Supporter-${suffix.slice(-8)}`;
  const supporterDisplayName = `${supporterFirstName} ${supporterLastName}`;

  await loginWithMfa(page, email, password);

  await page.goto("/crm/quick-add");
  await expect(page.getByRole("heading", { name: "Quick Add" })).toBeVisible();
  await page.getByLabel("First name").fill(supporterFirstName);
  await page.getByLabel("Last name").fill(supporterLastName);
  await page.getByLabel("Email").fill(supporterEmail);
  await page.getByLabel("Phone").fill(supporterPhone);
  await page.getByLabel("ZIP code").fill("12207");
  await page.getByRole("button", { name: "Add supporter" }).click();

  let createdPersonId: string | null = null;
  await expect.poll(async () => {
    const { data, error } = await admin
      .from("people")
      .select("id")
      .eq("normalized_email", supporterEmail)
      .maybeSingle();
    if (error) {
      throw new Error(`Quick Add verification select failed: ${error.code ?? "unknown"} ${error.message}`);
    }
    createdPersonId = data?.id ?? null;
    return createdPersonId;
  }, { timeout: 15_000 }).not.toBeNull();

  await expect(page).toHaveURL(new RegExp(`/crm/people/${createdPersonId}(?:\\?.*)?$`, "i"), {
    timeout: 15_000,
  });
  await expect(page.getByRole("heading", { name: supporterDisplayName })).toBeVisible();

  const { data: createdPerson, error: personError } = await admin
    .from("people")
    .select("id, normalized_email, engagement_stage")
    .eq("normalized_email", supporterEmail)
    .single();
  expect(personError).toBeNull();
  expect(createdPerson?.engagement_stage).toBe("follow_up_needed");

  const { data: followUp, error: taskError } = await admin
    .from("tasks")
    .select("task_type, queue_scope")
    .eq("person_id", createdPerson!.id)
    .eq("task_type", "initial_follow_up")
    .single();
  expect(taskError).toBeNull();
  expect(followUp?.queue_scope).toBe("county");

  await page.goto("/crm/quick-add");
  await page.getByLabel("First name").fill(supporterFirstName);
  await page.getByLabel("Last name").fill(supporterLastName);
  await page.getByLabel("Email").fill(`other-${supporterEmail}`);
  await page.getByLabel("Phone").fill(supporterPhone);
  await page.getByLabel("ZIP code").fill("12207");
  await page.getByRole("button", { name: "Add supporter" }).click();

  await expect(page.getByRole("heading", { name: "Possible existing contact" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Same phone")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create new record anyway" })).toBeVisible();
});
