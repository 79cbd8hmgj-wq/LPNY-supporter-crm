import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

test("public supporter can submit the short get-involved form", async ({ page }, testInfo) => {
  const email = `intake-${testInfo.project.name}-${Date.now()}@example.test`;

  await page.goto("/get-involved");
  await expect(page.getByRole("heading", { name: "Help build a freer New York" })).toBeVisible();
  await page.getByLabel("First name").fill("Test");
  await page.getByLabel("Last name").fill("Supporter");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("ZIP code").fill("10001");
  await page.getByLabel("Events").check();
  await page.getByLabel("Yes, I want to receive LPNY email updates.").check();
  await expect(page.locator('input[name="website"]')).toHaveValue("");

  const submissionPromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/intake/get-involved") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Get involved" }).click();
  const submission = await submissionPromise;

  expect(submission.status(), `Intake API returned ${submission.status()}`).toBe(200);
  await expect(page.getByRole("heading", { name: "Thanks for getting involved." })).toBeVisible({
    timeout: 10_000,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url).toBeTruthy();
  expect(serviceRoleKey).toBeTruthy();
  const admin = createClient(url!, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await expect.poll(async () => {
    const { data, error } = await admin
      .from("people")
      .select("normalized_email")
      .eq("normalized_email", email)
      .maybeSingle();

    if (error) {
      throw new Error(`Intake verification select failed: ${error.code ?? "unknown"} ${error.message}`);
    }

    return data?.normalized_email ?? null;
  }, { timeout: 10_000 }).toBe(email);
});

test("form explains that an email or phone number is required", async ({ page }) => {
  await page.goto("/get-involved");
  await page.getByLabel("First name").fill("No");
  await page.getByLabel("Last name").fill("Contact");
  await page.getByLabel("ZIP code").fill("10001");
  await page.getByRole("button", { name: "Get involved" }).click();

  await expect(page.getByText("Enter an email address or phone number")).toBeVisible();
});
