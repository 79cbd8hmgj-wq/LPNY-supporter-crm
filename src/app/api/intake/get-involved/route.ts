import { NextResponse } from "next/server";
import { InvalidZipError } from "@/lib/intake/geography";
import { getInvolvedInputSchema, type GetInvolvedInput } from "@/lib/intake/schema";
import { processGetInvolvedSubmission } from "@/lib/intake/service";

type ProcessSubmission = (input: GetInvolvedInput) => Promise<void>;

export async function handleGetInvolvedRequest(
  request: Request,
  processSubmission: ProcessSubmission = processGetInvolvedSubmission,
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

    console.error("Get involved intake failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleGetInvolvedRequest(request);
}
