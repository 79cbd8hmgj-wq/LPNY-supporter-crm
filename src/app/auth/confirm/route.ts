import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { establishInvitationSession } from "@/lib/auth/invitation";
import { getServerEnv } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const destination = new URL("/login?error=invalid-invitation", getServerEnv().APP_URL);
  const supabase = await createServerSupabaseClient();
  const user = await establishInvitationSession(supabase, new URL(request.url));
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
