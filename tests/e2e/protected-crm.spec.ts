import { expect, test } from "@playwright/test";

test("unauthenticated user is redirected from CRM to login", async ({ page }) => {
  await page.goto("/crm");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Staff sign in" })).toBeVisible();
});
