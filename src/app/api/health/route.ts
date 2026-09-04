import { NextResponse } from "next/server";
import { getBuildMetadata } from "@/lib/deployment/build-metadata";

export const dynamic = "force-dynamic";

const stagingSupabaseHostname = "jcuxbutwcmgohyikpvcq.supabase.co";

function getDataEnvironment() {
  try {
    const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!configuredUrl) return "other" as const;
    return new URL(configuredUrl).hostname === stagingSupabaseHostname
      ? ("staging" as const)
      : ("other" as const);
  } catch {
    return "other" as const;
  }
}

export function GET() {
  const build = getBuildMetadata();

  return NextResponse.json(
    {
      status: "ok",
      release: build.release,
      commitSha: build.commitSha,
      dataEnvironment: getDataEnvironment(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
