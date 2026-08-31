import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { requireSupabaseEnvironment } from "./support/staff-session";

test("public staff self-signup remains disabled", async () => {
  const { url, anonKey } = requireSupabaseEnvironment();
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signUp({
    email: `public-signup-${randomUUID()}@example.test`,
    password: `Blocked-${randomUUID()}-Aa1!`,
  });

  expect(error).not.toBeNull();
  expect(data.user).toBeNull();
});
