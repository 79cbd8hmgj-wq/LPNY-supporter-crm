import type { EmailOtpType } from "@supabase/supabase-js";
import { z } from "zod";

export const invitationCallbackSchema = z.union([
  z.object({ token_hash: z.string().min(1), type: z.literal("invite") }),
  z.object({ code: z.string().min(1) }),
]);

export const invitationPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol.");

export function parseInvitationCallback(url: URL) {
  return invitationCallbackSchema.safeParse({
    token_hash: url.searchParams.get("token_hash") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    code: url.searchParams.get("code") ?? undefined,
  });
}

export type InvitationAuthClient = {
  auth: {
    verifyOtp(input: { token_hash: string; type: EmailOtpType }): Promise<{ error: unknown }>;
    exchangeCodeForSession(code: string): Promise<{ error: unknown }>;
    getUser(): Promise<{ data: { user: { id: string; invited_at?: string } | null }; error: unknown }>;
    signOut(): Promise<unknown>;
  };
};

export async function establishInvitationSession(client: InvitationAuthClient, url: URL) {
  const parsed = parseInvitationCallback(url);
  if (!parsed.success) return null;

  const result = "code" in parsed.data
    ? await client.auth.exchangeCodeForSession(parsed.data.code)
    : await client.auth.verifyOtp({ token_hash: parsed.data.token_hash, type: "invite" });
  if (result.error) return null;

  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.invited_at) {
    await client.auth.signOut();
    return null;
  }
  return data.user;
}
