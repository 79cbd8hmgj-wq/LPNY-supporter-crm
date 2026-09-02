import { NextResponse } from "next/server";
import { InvalidZipError } from "@/lib/intake/geography";
import { isIntakeRateLimited } from "@/lib/intake/rate-limit";
import { getInvolvedInputSchema, type GetInvolvedInput } from "@/lib/intake/schema";
import { processGetInvolvedSubmission } from "@/lib/intake/service";

type ProcessSubmission = (input: GetInvolvedInput) => Promise<void>;
type CheckRateLimit = (request: Request) => Promise<boolean>;

const MAX_INTAKE_BODY_BYTES = 16 * 1024;

class IntakeBodyTooLargeError extends Error {}

async function readJsonBody(request: Request): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declaredBytes = Number.parseInt(contentLength, 10);
    if (Number.isFinite(declaredBytes) && declaredBytes > MAX_INTAKE_BODY_BYTES) {
      throw new IntakeBodyTooLargeError();
    }
  }

  if (!request.body) {
    throw new SyntaxError("Missing request body");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let bodyText = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bytesRead += value.byteLength;
      if (bytesRead > MAX_INTAKE_BODY_BYTES) {
        await reader.cancel();
        throw new IntakeBodyTooLargeError();
      }

      bodyText += decoder.decode(value, { stream: true });
    }

    bodyText += decoder.decode();
    return JSON.parse(bodyText);
  } finally {
    reader.releaseLock();
  }
}

export async function handleGetInvolvedRequest(
  request: Request,
  processSubmission: ProcessSubmission = processGetInvolvedSubmission,
  checkRateLimit: CheckRateLimit = isIntakeRateLimited,
) {
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    if (error instanceof IntakeBodyTooLargeError) {
      return NextResponse.json({ ok: false }, { status: 413 });
    }
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
