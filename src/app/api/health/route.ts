import { NextResponse } from "next/server";
import { getBuildMetadata } from "@/lib/deployment/build-metadata";

export const dynamic = "force-dynamic";

export function GET() {
  const build = getBuildMetadata();

  return NextResponse.json(
    {
      status: "ok",
      release: build.release,
      commitSha: build.commitSha,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
