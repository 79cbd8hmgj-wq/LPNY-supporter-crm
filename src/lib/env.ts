import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export const env = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export function getServerEnv() {
  return serverEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
