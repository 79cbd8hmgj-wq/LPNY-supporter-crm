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
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText(visibleTitle)).toBeVisible();
    await expect(page.getByText(privateTitle)).not.toBeVisible();

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
