import { NextResponse } from "next/server";
import { InvalidZipError } from "@/lib/intake/geography";
import { isIntakeRateLimited } from "@/lib/intake/rate-limit";
import { getInvolvedInputSchema, type GetInvolvedInput } from "@/lib/intake/schema";
import { processGetInvolvedSubmission } from "@/lib/intake/service";

type ProcessSubmission = (input: GetInvolvedInput) => Promise<void>;
type CheckRateLimit = (request: Request) => Promise<boolean>;

export async function handleGetInvolvedRequest(
  request: Request,
  processSubmission: ProcessSubmission = processGetInvolvedSubmission,
  checkRateLimit: CheckRateLimit = isIntakeRateLimited,
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, errors: { form: ["Invalid request"] } }, { status: 400 });
  }

  const parsed = getInvolvedInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (parsed.data.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  if (await checkRateLimit(request)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  try {
    await processSubmission(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InvalidZipError) {
      return NextResponse.json(
        { ok: false, errors: { zipCode: ["Enter a valid ZIP code"] } },
        { status: 400 },
      );
    }

    console.error("Get involved intake failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleGetInvolvedRequest(request);
}
