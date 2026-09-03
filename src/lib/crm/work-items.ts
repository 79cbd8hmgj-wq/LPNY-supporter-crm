import { parseNewYorkLocalDateTime } from "./organizer-actions";

export type WorkItemResult = { status: "success" | "error"; message: string };

function text(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized && normalized.length <= max ? normalized : null;
}

export function validateTaskInput(input: Record<string, unknown>) {
  const personId = typeof input.personId === "string" && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(input.personId) ? input.personId : null;
  const title = text(input.title, 120);
  const dueAt = typeof input.dueAt === "string" ? parseNewYorkLocalDateTime(input.dueAt) : null;
  const priority = input.priority === "low" || input.priority === "normal" || input.priority === "high"
    ? input.priority as "low" | "normal" | "high"
    : null;
  return personId && title && dueAt && priority ? { personId, title, dueAt, priority } : null;
}

export function validateEventInput(input: Record<string, unknown>) {
  const title = text(input.title, 160);
  const location = input.location === "" ? null : text(input.location, 240);
  const description = input.description === "" ? null : text(input.description, 2000);
  const startsAt = typeof input.startsAt === "string" ? parseNewYorkLocalDateTime(input.startsAt) : null;
  const endsAt = input.endsAt === "" ? null : typeof input.endsAt === "string" ? parseNewYorkLocalDateTime(input.endsAt) : null;
  if (!title || !startsAt || (input.location !== "" && !location) || (input.description !== "" && !description) || (input.endsAt !== "" && !endsAt)) return null;
  if (endsAt && new Date(endsAt) <= new Date(startsAt)) return null;
  return { title, location, description, startsAt, endsAt };
}
