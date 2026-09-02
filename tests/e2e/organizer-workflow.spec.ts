import { expect, test } from "@playwright/test";
import { loginWithMfa, provisionAdminStaff, provisionStaff } from "./support/staff-session";

test("organizer can work a queued supporter from dashboard through completed follow-up", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const { admin, email, password, staffUserId, suffix } = await provisionAdminStaff(testInfo, "workflow-staff");
  const unique = suffix.slice(-8);
  const firstName = "Workflow";
  const lastName = `Supporter${unique}`;
  const fullName = `${firstName} ${lastName}`;
  const supporterEmail = `workflow-supporter-${suffix}@example.test`;
  const viewName = `Queue ${unique}`;

  const { data: county, error: countyError } = await admin
    .from("counties")
    .select("id")
    .eq("name", "Albany")
    .single();
  expect(countyError).toBeNull();

  const { data: source, error: sourceError } = await admin
    .from("sources")
    .select("id")
    .eq("slug", "organizer-entry")
    .single();
  expect(sourceError).toBeNull();

  const { data: supporterRelationship, error: relationshipError } = await admin
    .from("relationship_types")
    .select("id")
    .eq("slug", "supporter")
    .single();
  expect(relationshipError).toBeNull();

  const { data: person, error: personError } = await admin
    .from("people")
    .insert({
      first_name: firstName,
      last_name: lastName,
      email: supporterEmail,
      normalized_email: supporterEmail,
      zip_code: "12207",
      county_id: county!.id,
      municipality: "Albany",
      engagement_stage: "new",
      assigned_staff_user_id: staffUserId,
    })
    .select("id")
    .single();
  expect(personError).toBeNull();

  const { error: relationshipInsertError } = await admin.from("person_relationships").insert({
    person_id: person!.id,
    relationship_type_id: supporterRelationship!.id,
  });
  expect(relationshipInsertError).toBeNull();

  const { error: sourceInsertError } = await admin.from("person_sources").insert({
    person_id: person!.id,
    source_id: source!.id,
    metadata: { entry_method: "workflow_acceptance" },
  });
  expect(sourceInsertError).toBeNull();

  const { error: activityError } = await admin.from("activities").insert({
    person_id: person!.id,
    activity_type: "organizer_entry",
    actor_staff_user_id: staffUserId,
    metadata: { source: "workflow_acceptance" },
  });
  expect(activityError).toBeNull();

  const { error: taskError } = await admin.from("tasks").insert({
    person_id: person!.id,
    assignee_staff_user_id: staffUserId,
    queue_scope: "county",
    queue_county_id: county!.id,
    task_type: "initial_follow_up",
    due_at: new Date().toISOString(),
    priority: "high",
    status: "open",
    created_by_staff_user_id: staffUserId,
  });
  expect(taskError).toBeNull();

  await loginWithMfa(page, email, password);

  await expect(page.getByRole("heading", { name: "CRM Dashboard" })).toBeVisible();
  const newSupporters = page.getByRole("heading", { name: "New supporters" }).locator("xpath=ancestor::section[1]");
  await expect(newSupporters.getByRole("link", { name: fullName })).toBeVisible();
  const dueToday = page.getByRole("heading", { name: "Follow-up due today" }).locator("xpath=ancestor::section[1]");
  await expect(dueToday.getByRole("link", { name: fullName })).toBeVisible();

  await page.getByRole("link", { name: "People", exact: true }).click();
  await page.getByLabel("Name, email, phone, ZIP, municipality").fill(supporterEmail);
  await page.locator('select[name="county"]').selectOption({ label: "Albany" });
  await page.getByLabel("Engagement stage").selectOption("new");
  await page.getByText("More filters", { exact: true }).click();
  await page.getByLabel("Has open task").selectOption("yes");
  await page.getByLabel("Source").selectOption("organizer-entry");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("link", { name: fullName })).toBeVisible();

  await page.getByPlaceholder("Name this view").fill(viewName);
  await page.getByRole("button", { name: "Save current view" }).click();
  await expect(page.getByRole("status")).toContainText("Saved the current people view.");
  await expect(page.getByText(viewName, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Apply" }).click();
  await expect(page.getByLabel("Name, email, phone, ZIP, municipality")).toHaveValue(supporterEmail);
  await expect(page.getByLabel("Engagement stage")).toHaveValue("new");
  await expect(page.getByLabel("Has open task")).toHaveValue("yes");
  await expect(page.getByLabel("Source")).toHaveValue("organizer-entry");

  await page.getByRole("link", { name: fullName }).click();
  await expect(page.getByRole("heading", { name: fullName })).toBeVisible();
  const sources = page.getByRole("heading", { name: "Sources" }).locator("xpath=ancestor::section[1]");
  await expect(sources.getByText("Organizer Entry", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Complete" }).click();
  await expect(page.getByRole("status")).toContainText("Task completed.");
  const tasks = page.getByRole("heading", { name: "Tasks" }).locator("xpath=ancestor::section[1]");
  await expect(tasks.getByText("Initial Follow Up", { exact: true })).toBeVisible();
  await expect(tasks.getByText("Completed", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Mark contacted" }).click();
  await expect(page.getByRole("status")).toContainText("Contact outcome recorded.");
  await expect(page.locator("header").getByText("Contacted", { exact: true })).toBeVisible();
  const activity = page.getByRole("heading", { name: "Activity" }).locator("xpath=ancestor::section[1]");
  await expect(activity.getByText("Contacted", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  const recentlyContacted = page.getByRole("heading", { name: "Recently contacted" }).locator("xpath=ancestor::section[1]");
  await expect(recentlyContacted.getByRole("link", { name: fullName })).toBeVisible();
});

test("county organizer reporting respects RLS scope and period selection", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const { admin, email, password, staffUserId, suffix } = await provisionStaff(
    testInfo,
    "reporting-county",
    "county_organizer",
  );
  const unique = suffix.slice(-8);
  const inScopeSourceName = `Albany Reporting ${unique}`;
  const outOfScopeSourceName = `Erie Reporting ${unique}`;

  const { data: counties, error: countiesError } = await admin
    .from("counties")
    .select("id, name")
    .in("name", ["Albany", "Erie"]);
  expect(countiesError).toBeNull();
  const albany = counties?.find((county) => county.name === "Albany");
  const erie = counties?.find((county) => county.name === "Erie");
  expect(albany?.id).toBeTruthy();
  expect(erie?.id).toBeTruthy();

  const { data: sources, error: sourcesError } = await admin
    .from("sources")
    .insert([
      {
        slug: `reporting-albany-${suffix}`,
        category: "acceptance",
        name: inScopeSourceName,
      },
      {
        slug: `reporting-erie-${suffix}`,
        category: "acceptance",
        name: outOfScopeSourceName,
      },
    ])
    .select("id, name");
  expect(sourcesError).toBeNull();
  const inScopeSource = sources?.find((source) => source.name === inScopeSourceName);
  const outOfScopeSource = sources?.find((source) => source.name === outOfScopeSourceName);
  expect(inScopeSource?.id).toBeTruthy();
  expect(outOfScopeSource?.id).toBeTruthy();

  const { data: people, error: peopleError } = await admin
    .from("people")
    .insert([
      {
        first_name: "Albany",
        last_name: `Reporting${unique}`,
        email: `reporting-albany-${suffix}@example.test`,
        normalized_email: `reporting-albany-${suffix}@example.test`,
        zip_code: "12207",
        county_id: albany!.id,
        municipality: "Albany",
        engagement_stage: "engaged",
        assigned_staff_user_id: staffUserId,
      },
      {
        first_name: "Erie",
        last_name: `Reporting${unique}`,
        email: `reporting-erie-${suffix}@example.test`,
        normalized_email: `reporting-erie-${suffix}@example.test`,
        zip_code: "14202",
        county_id: erie!.id,
        municipality: "Buffalo",
        engagement_stage: "engaged",
      },
    ])
    .select("id, county_id");
  expect(peopleError).toBeNull();
  const inScopePerson = people?.find((person) => person.county_id === albany!.id);
  const outOfScopePerson = people?.find((person) => person.county_id === erie!.id);
  expect(inScopePerson?.id).toBeTruthy();
  expect(outOfScopePerson?.id).toBeTruthy();

  const { error: sourceLinksError } = await admin.from("person_sources").insert([
    { person_id: inScopePerson!.id, source_id: inScopeSource!.id },
    { person_id: outOfScopePerson!.id, source_id: outOfScopeSource!.id },
  ]);
  expect(sourceLinksError).toBeNull();

  await loginWithMfa(page, email, password);

  await expect(page.getByRole("heading", { name: "CRM Dashboard" })).toBeVisible();
  await expect(page.getByText("Active contacts", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Source performance" })).toBeVisible();

  const sourcePerformance = page
    .getByRole("heading", { name: "Source performance" })
    .locator("xpath=ancestor::section[1]");
  await expect(sourcePerformance.getByText(inScopeSourceName, { exact: true })).toBeVisible();
  await expect(sourcePerformance.getByText(outOfScopeSourceName, { exact: true })).toHaveCount(0);

  const countyBreakdown = page.getByRole("heading", { name: "By county" }).locator("xpath=ancestor::section[1]");
  await expect(countyBreakdown.getByText("Albany", { exact: true })).toBeVisible();
  await expect(countyBreakdown.getByText("Erie", { exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: "90 days" }).click();
  await expect(page).toHaveURL(/\/crm\?period=90d$/);
  await expect(page.getByRole("link", { name: "90 days" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "New supporters" })).toBeVisible();
  await expect(sourcePerformance.getByText(outOfScopeSourceName, { exact: true })).toHaveCount(0);
});
