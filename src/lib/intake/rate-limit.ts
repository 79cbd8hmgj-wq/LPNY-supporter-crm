import "server-only";

import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { env, getServerEnv } from "@/lib/env";

const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const RATE_LIMIT_MAX_REQUESTS = 5;

function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
}

export async function isIntakeRateLimited(request: Request): Promise<boolean> {
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
  const clientHash = createHmac("sha256", SUPABASE_SERVICE_ROLE_KEY)
    .update(clientAddress(request))
    .digest("hex");

  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await admin.rpc("consume_intake_rate_limit", {
    p_client_hash: clientHash,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    p_limit: RATE_LIMIT_MAX_REQUESTS,
  });

  if (error) {
    console.error("Intake rate limit check failed");
    return true;
  }

  return data === true;
}
