import { expect, test } from "@playwright/test";
import { loginWithMfa, provisionAdminStaff } from "./support/staff-session";

test("staff member can sign out and cannot re-enter the CRM without login", async ({ page }, testInfo) => {
  const { admin, authUserId, email, password } = await provisionAdminStaff(testInfo, "sign-out");

  try {
    await loginWithMfa(page, email, password);
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    await page.goto("/crm/people");
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: "Staff sign in" })).toBeVisible();
  } finally {
    // These fixtures are synthetic; cleanup must not touch real supporter identities.
    await admin.auth.admin.deleteUser(authUserId);
  }
});
