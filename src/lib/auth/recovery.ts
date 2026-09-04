import type { EmailOtpType } from "@supabase/supabase-js";
import { z } from "zod";

export const recoveryEmailSchema = z.string().trim().email();

export const staffPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol.");

const recoveryCallbackSchema = z.union([
  z.object({ token_hash: z.string().min(1), type: z.literal("recovery") }),
  z.object({ code: z.string().min(1), type: z.literal("recovery") }),
]);

type RecoveryAuthClient = {
  auth: {
    verifyOtp(input: { token_hash: string; type: EmailOtpType }): Promise<{ error: unknown }>;
    exchangeCodeForSession(code: string): Promise<{ error: unknown }>;
    getUser(): Promise<{ data: { user: { id: string } | null }; error: unknown }>;
  };
};

export async function establishRecoverySession(client: RecoveryAuthClient, url: URL) {
  const parsed = recoveryCallbackSchema.safeParse({
    token_hash: url.searchParams.get("token_hash") ?? undefined,
    code: url.searchParams.get("code") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
  });
  if (!parsed.success) return null;

  const result = "code" in parsed.data
    ? await client.auth.exchangeCodeForSession(parsed.data.code)
    : await client.auth.verifyOtp({ token_hash: parsed.data.token_hash, type: "recovery" });
  if (result.error) return null;

  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}
