import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, type Page, type TestInfo } from "@playwright/test";

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

export function requireSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url).toBeTruthy();
  expect(anonKey).toBeTruthy();
  expect(serviceRoleKey).toBeTruthy();
  return { url: url!, anonKey: anonKey!, serviceRoleKey: serviceRoleKey! };
}

export async function provisionAdminStaff(testInfo: TestInfo, prefix: string) {
  const { url, anonKey, serviceRoleKey } = requireSupabaseEnvironment();
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const suffix = `${testInfo.project.name}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const email = `${prefix}-${suffix}@example.test`;
  const password = `Staff-${randomUUID()}-Aa1!`;

  const { data: createdAuth, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  expect(authError).toBeNull();
  expect(createdAuth.user).toBeTruthy();

  const authProbe = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: probeError } = await authProbe.auth.signInWithPassword({ email, password });
  expect(
    probeError,
    `Direct password-auth probe failed: ${probeError?.status ?? "unknown"} ${probeError?.code ?? "unknown"} ${probeError?.message ?? "unknown"}`,
  ).toBeNull();
  await authProbe.auth.signOut();

  const { data: staff, error: staffError } = await admin
    .from("staff_users")
    .insert({
      auth_user_id: createdAuth.user!.id,
      display_name: `Browser Admin ${testInfo.project.name}`,
      role: "admin",
      status: "active",
    })
    .select("id")
    .single();
  expect(staffError).toBeNull();
  expect(staff?.id).toBeTruthy();

  return { admin, email, password, staffUserId: staff!.id, suffix };
}

export async function loginWithMfa(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/mfa(?:\?.*)?$/, { timeout: 10_000 });

  await page.getByRole("button", { name: "Set up authenticator" }).click();
  const manualKey = page.getByText(/^Manual key:/);
  await expect(manualKey).toBeVisible({ timeout: 10_000 });
  const secret = (await manualKey.textContent())?.replace(/^Manual key:\s*/, "").trim();
  expect(secret).toBeTruthy();

  await page.getByLabel("6-digit code").fill(totp(secret!));
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page).toHaveURL(/\/crm(?:\?.*)?$/, { timeout: 10_000 });
}
