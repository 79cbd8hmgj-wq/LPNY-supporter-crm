import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

function decodeBase32(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = secret.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";

  for (const character of normalized) {
    const value = alphabet.indexOf(character);
    if (value < 0) throw new Error("Invalid base32 TOTP secret");
    bits += value.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
}

function totp(secret: string, timestamp = Date.now()) {
  const counter = Math.floor(timestamp / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

function requireSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url).toBeTruthy();
  expect(anonKey).toBeTruthy();
  expect(serviceRoleKey).toBeTruthy();
  return { url: url!, anonKey: anonKey!, serviceRoleKey: serviceRoleKey! };
}

test("organizer can Quick Add a supporter and sees duplicate warnings", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const { url, anonKey, serviceRoleKey } = requireSupabaseEnvironment();
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const suffix = `${testInfo.project.name}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const staffEmail = `quick-add-staff-${suffix}@example.test`;
  const staffPassword = `QuickAdd-${randomUUID()}-Aa1!`;
  const supporterEmail = `quick-add-supporter-${suffix}@example.test`;
  const supporterPhone = `518555${Math.floor(1000 + Math.random() * 8999)}`;
  const supporterFirstName = testInfo.project.name === "webkit-mobile" ? "WebKit" : "Chromium";
  const supporterLastName = "Supporter";
  const supporterDisplayName = `${supporterFirstName} ${supporterLastName}`;

  const { data: createdAuth, error: authError } = await admin.auth.admin.createUser({
    email: staffEmail,
    password: staffPassword,
    email_confirm: true,
  });
  expect(authError).toBeNull();
  expect(createdAuth.user).toBeTruthy();

  const authProbe = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: probeError } = await authProbe.auth.signInWithPassword({
    email: staffEmail,
    password: staffPassword,
  });
  expect(
    probeError,
    `Direct password-auth probe failed: ${probeError?.status ?? "unknown"} ${probeError?.code ?? "unknown"} ${probeError?.message ?? "unknown"}`,
  ).toBeNull();
  await authProbe.auth.signOut();

  const { error: staffError } = await admin.from("staff_users").insert({
    auth_user_id: createdAuth.user!.id,
    display_name: `Quick Add ${testInfo.project.name}`,
    role: "admin",
    status: "active",
  });
  expect(staffError).toBeNull();

  await page.goto("/login");
  await page.getByLabel("Email").fill(staffEmail);
  await page.getByLabel("Password").fill(staffPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/mfa(?:\?.*)?$/);

  await page.getByRole("button", { name: "Set up authenticator" }).click();
  const manualKey = page.getByText(/^Manual key:/);
  await expect(manualKey).toBeVisible();
  const secret = (await manualKey.textContent())?.replace(/^Manual key:\s*/, "").trim();
  expect(secret).toBeTruthy();

  await page.getByLabel("6-digit code").fill(totp(secret!));
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page).toHaveURL(/\/crm(?:\?.*)?$/);

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

  await expect(page.getByRole("heading", { name: "Possible existing contact" })).toBeVisible();
  await expect(page.getByText("Same phone")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create new record anyway" })).toBeVisible();
});
