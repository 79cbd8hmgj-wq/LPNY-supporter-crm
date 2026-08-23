import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, getServerEnv } from "@/lib/env";
import type { Database } from "./database.types";

export function createAdminSupabaseClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
