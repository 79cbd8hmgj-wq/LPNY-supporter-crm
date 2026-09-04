import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { requireSupabaseEnvironment, totp } from "./support/staff-session";

test("an invited staff member sets an initial password and enrolls TOTP", async ({ page }, testInfo) => {
  const { url, serviceRoleKey } = requireSupabaseEnvironment();
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `invitation-${randomUUID()}@example.test`;
  const password = `Invited-${randomUUID()}-Aa1!`;
  const baseURL = String(testInfo.project.use.baseURL);

  // generateLink creates a real one-time invitation without assigning a password or sending email.
  const { data: invitation, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: new URL("/auth/confirm", baseURL).toString() },
  });
  expect(error).toBeNull();
  expect(invitation.user).toBeTruthy();
  expect(invitation.properties).toBeTruthy();
  const invitedUser = invitation.user!;
  const properties = invitation.properties!;

  const { error: staffError } = await admin.from("staff_users").insert({
    auth_user_id: invitedUser.id,
    display_name: "Invitation Browser Test",
    role: "volunteer_staff",
    status: "active",
  });
  expect(staffError).toBeNull();

  try {
    await page.goto(properties.action_link);
    await expect(page).toHaveURL(/\/auth\/setup-password$/);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("button", { name: "Set password and continue" }).click();
    await expect(page).toHaveURL(/\/mfa$/);

    await page.getByRole("button", { name: "Set up authenticator" }).click();
    const manualKey = page.getByText(/^Manual key:/);
    await expect(manualKey).toBeVisible();
    const secret = (await manualKey.textContent())!.replace(/^Manual key:\s*/, "").trim();
    await page.getByLabel("6-digit code").fill(totp(secret));
    await page.getByRole("button", { name: "Verify and continue" }).click();
    await expect(page).toHaveURL(/\/crm(?:\?.*)?$/);
  } finally {
    await admin.auth.admin.deleteUser(invitedUser.id);
  }
});
