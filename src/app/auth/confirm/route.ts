import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { establishInvitationSession } from "@/lib/auth/invitation";
import { establishRecoverySession } from "@/lib/auth/recovery";
import { getServerEnv } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  if (requestUrl.searchParams.get("type") === "recovery") {
    const invalidRecovery = new URL("/login?error=invalid-recovery", getServerEnv().APP_URL);
    const supabase = await createServerSupabaseClient();
    const user = await establishRecoverySession(supabase, requestUrl);
    if (!user) return NextResponse.redirect(invalidRecovery);

    const cookieStore = await cookies();
    cookieStore.set("password_recovery", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: invalidRecovery.protocol === "https:",
      maxAge: 60 * 30,
      path: "/auth/reset-password",
    });
    return NextResponse.redirect(new URL("/auth/reset-password", getServerEnv().APP_URL));
  }

  const destination = new URL("/login?error=invalid-invitation", getServerEnv().APP_URL);
  const supabase = await createServerSupabaseClient();
  const user = await establishInvitationSession(supabase, requestUrl);
  if (!user) return NextResponse.redirect(destination);

  const cookieStore = await cookies();
  cookieStore.set("invitation_setup", user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: destination.protocol === "https:",
    maxAge: 60 * 30,
    path: "/auth/setup-password",
  });
  return NextResponse.redirect(new URL("/auth/setup-password", getServerEnv().APP_URL));
}
