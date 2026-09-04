import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { requireSupabaseEnvironment } from "./support/staff-session";

test("supporter claims their profile and sees only published supporter events", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const { url, serviceRoleKey } = requireSupabaseEnvironment();
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const suffix = randomUUID().slice(0, 8);
  const email = `supporter-portal-${testInfo.project.name}-${suffix}@example.test`;
  const staffEmail = `supporter-event-staff-${testInfo.project.name}-${suffix}@example.test`;
  const baseURL = String(testInfo.project.use.baseURL);
  const visibleTitle = `Supporter Meetup ${suffix}`;
  const privateTitle = `Staff Planning ${suffix}`;

  const { data: person, error: personError } = await admin
    .from("people")
    .insert({
      first_name: "Portal",
      last_name: `Supporter ${suffix}`,
      email,
      normalized_email: email,
      zip_code: "12207",
    })
    .select("id")
    .single();
  expect(personError).toBeNull();
  expect(person?.id).toBeTruthy();

  const { data: staffAuth, error: staffAuthError } = await admin.auth.admin.createUser({
    email: staffEmail,
    email_confirm: true,
  });
  expect(staffAuthError).toBeNull();
  expect(staffAuth.user).toBeTruthy();

  const { data: staff, error: staffError } = await admin
    .from("staff_users")
    .insert({
      auth_user_id: staffAuth.user!.id,
      display_name: `Supporter Event Staff ${suffix}`,
      role: "state_organizer",
      status: "active",
    })
    .select("id")
    .single();
  expect(staffError).toBeNull();
  expect(staff?.id).toBeTruthy();

  const { error: eventsError } = await admin.from("crm_events").insert([
    {
      title: visibleTitle,
      description: "A supporter-visible event.",
      location: "Albany",
      starts_at: new Date(Date.now() + 86_400_000).toISOString(),
      created_by_staff_user_id: staff!.id,
      visibility: "supporters",
    },
    {
      title: privateTitle,
      description: "Internal planning.",
      location: "Albany",
      starts_at: new Date(Date.now() + 172_800_000).toISOString(),
      created_by_staff_user_id: staff!.id,
      visibility: "staff",
    },
  ]);
  expect(eventsError).toBeNull();

  const { data: invitation, error: invitationError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: new URL("/supporter/auth/confirm", baseURL).toString() },
  });
  expect(invitationError).toBeNull();
  expect(invitation.user).toBeTruthy();
  expect(invitation.properties).toBeTruthy();

  try {
    const confirmUrl = new URL("/supporter/auth/confirm", baseURL);
    confirmUrl.searchParams.set("token_hash", invitation.properties!.hashed_token);
    confirmUrl.searchParams.set("type", "invite");
    await page.goto(confirmUrl.toString());

    await expect(page).toHaveURL(/\/supporter$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Welcome, Portal" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /^Email/ })).toHaveValue(email);
    await expect(page.getByText(visibleTitle)).toBeVisible();
    await expect(page.getByText(privateTitle)).not.toBeVisible();

    await page.getByLabel("First name").fill("Portal Updated");
    await page.getByLabel("Phone").fill("(315) 555-0199");
    await page.getByLabel("ZIP code").fill("13202");
    await page.getByLabel("Events", { exact: true }).check();
    await page.getByLabel("Send me LPNY email updates.").check();
    await page
      .getByLabel("LPNY may call or text me about organizing opportunities.")
      .check();
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Your profile has been updated.")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Welcome, Portal Updated" })).toBeVisible();
    await expect(page.getByLabel("Phone")).toHaveValue("(315) 555-0199");
    await expect(page.getByLabel("ZIP code")).toHaveValue("13202");
    await expect(page.getByLabel("Events", { exact: true })).toBeChecked();

    const { data: updatedPerson, error: updatedPersonError } = await admin
      .from("people")
      .select("first_name, normalized_phone, zip_code, municipality, engagement_stage")
      .eq("id", person!.id)
      .single();
    expect(updatedPersonError).toBeNull();
    expect(updatedPerson).toMatchObject({
      first_name: "Portal Updated",
      normalized_phone: "3155550199",
      zip_code: "13202",
      municipality: "Syracuse",
      engagement_stage: "new",
    });

    const { data: selectedInterests, error: selectedInterestsError } = await admin
      .from("person_interests")
      .select("interests!inner(slug)")
      .eq("person_id", person!.id);
    expect(selectedInterestsError).toBeNull();
    expect(JSON.stringify(selectedInterests)).toContain("events");

    const { data: mapping, error: mappingError } = await admin
      .from("supporter_accounts")
      .select("person_id")
      .eq("auth_user_id", invitation.user!.id)
      .single();
    expect(mappingError).toBeNull();
    expect(mapping?.person_id).toBe(person!.id);

    await page.goto("/crm");
    await expect(page).toHaveURL(/\/login\?error=not-authorized$/, { timeout: 10_000 });
  } finally {
    await admin.from("crm_events").delete().in("title", [visibleTitle, privateTitle]);
    await admin.auth.admin.deleteUser(invitation.user!.id);
    await admin.from("people").delete().eq("id", person!.id);
    await admin.from("staff_users").delete().eq("id", staff!.id);
    await admin.auth.admin.deleteUser(staffAuth.user!.id);
  }
});
