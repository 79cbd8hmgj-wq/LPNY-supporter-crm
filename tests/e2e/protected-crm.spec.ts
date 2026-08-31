import { expect, test } from "@playwright/test";

for (const path of ["/crm", "/crm/people"]) {
  test(`unauthenticated user is redirected from ${path} to login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Staff sign in" })).toBeVisible();
  });
}
