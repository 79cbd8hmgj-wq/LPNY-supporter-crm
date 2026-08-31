import type { Database } from "@/lib/supabase/database.types";

const NEW_YORK_TIME_ZONE = "America/New_York";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const TAXONOMY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type TaskPriority = Database["public"]["Enums"]["task_priority"];
type EngagementStage = Database["public"]["Enums"]["engagement_stage"];
type ContactOutcome = "contacted" | "unable_to_reach";

type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const dateTimePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: NEW_YORK_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  const value = parts.find((part) => part.type === type)?.value;
  return value ? Number(value) : Number.NaN;
}

function wallClockFor(date: Date): WallClock {
  const parts = dateTimePartsFormatter.formatToParts(date);
  return {
    year: getPart(parts, "year"),
    month: getPart(parts, "month"),
    day: getPart(parts, "day"),
    hour: getPart(parts, "hour"),
    minute: getPart(parts, "minute"),
  };
}

function offsetMilliseconds(date: Date) {
  const parts = dateTimePartsFormatter.formatToParts(date);
  const localAsUtc = Date.UTC(
    getPart(parts, "year"),
    getPart(parts, "month") - 1,
    getPart(parts, "day"),
    getPart(parts, "hour"),
    getPart(parts, "minute"),
    getPart(parts, "second"),
  );
  return localAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function sameWallClock(a: WallClock, b: WallClock) {
  return a.year === b.year
    && a.month === b.month
    && a.day === b.day
    && a.hour === b.hour
    && a.minute === b.minute;
}

function parseWallClock(value: string): WallClock | null {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);
  if (!match) return null;

  const wallClock: WallClock = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };

  if (wallClock.hour > 23 || wallClock.minute > 59) return null;

  const normalized = new Date(Date.UTC(
    wallClock.year,
    wallClock.month - 1,
    wallClock.day,
    wallClock.hour,
    wallClock.minute,
  ));

  if (
    normalized.getUTCFullYear() !== wallClock.year
    || normalized.getUTCMonth() + 1 !== wallClock.month
    || normalized.getUTCDate() !== wallClock.day
    || normalized.getUTCHours() !== wallClock.hour
    || normalized.getUTCMinutes() !== wallClock.minute
  ) {
    return null;
  }

  return wallClock;
}

function parseBoolean(value: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function parseNewYorkLocalDateTime(value: string) {
  const wallClock = parseWallClock(value);
  if (!wallClock) return null;

  const desiredWallClockMs = Date.UTC(
    wallClock.year,
    wallClock.month - 1,
    wallClock.day,
    wallClock.hour,
    wallClock.minute,
  );

  let candidate = new Date(desiredWallClockMs);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    candidate = new Date(desiredWallClockMs - offsetMilliseconds(candidate));
  }

  if (!sameWallClock(wallClockFor(candidate), wallClock)) {
    return null;
  }

  return candidate.toISOString();
}

export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export function validateFollowUpInput(input: {
  personId: string;
  dueAt: string;
  priority: string;
}): { personId: string; dueAt: string; priority: TaskPriority } | null {
  const dueAt = parseNewYorkLocalDateTime(input.dueAt);
  const priority = input.priority as TaskPriority;

  if (!isUuid(input.personId) || !dueAt || !(["low", "normal", "high"] as const).includes(priority)) {
    return null;
  }

  return { personId: input.personId, dueAt, priority };
}

export function validateNoteInput(input: {
  personId: string;
  body: string;
}): { personId: string; body: string } | null {
  const body = input.body.trim();
  if (!isUuid(input.personId) || body.length === 0 || body.length > 4000) {
    return null;
  }

  return { personId: input.personId, body };
}

export function validateContactOutcomeInput(input: {
  personId: string;
  outcome: string;
  followUpDueAt: string;
}): { personId: string; outcome: ContactOutcome; followUpDueAt: string | null } | null {
  if (!isUuid(input.personId) || (input.outcome !== "contacted" && input.outcome !== "unable_to_reach")) {
    return null;
  }

  const followUpDueAt = input.followUpDueAt
    ? parseNewYorkLocalDateTime(input.followUpDueAt)
    : null;

  if (input.followUpDueAt && !followUpDueAt) return null;

  return {
    personId: input.personId,
    outcome: input.outcome,
    followUpDueAt,
  };
}

export function validateStageInput(input: {
  personId: string;
  stage: string;
}): { personId: string; stage: EngagementStage } | null {
  const stage = input.stage as EngagementStage;
  if (
    !isUuid(input.personId)
    || !(["new", "follow_up_needed", "contacted", "engaged", "inactive"] as const).includes(stage)
  ) {
    return null;
  }

  return { personId: input.personId, stage };
}

export function validateTaxonomyToggleInput(input: {
  personId: string;
  slug: string;
  enabled: string;
}): { personId: string; slug: string; enabled: boolean } | null {
  const slug = input.slug.trim();
  const enabled = parseBoolean(input.enabled);
  if (
    !isUuid(input.personId)
    || slug.length === 0
    || slug.length > 80
    || !TAXONOMY_SLUG_PATTERN.test(slug)
    || enabled === null
  ) {
    return null;
  }

  return { personId: input.personId, slug, enabled };
}

export function validateTagToggleInput(input: {
  personId: string;
  tagId: string;
  enabled: string;
}): { personId: string; tagId: string; enabled: boolean } | null {
  const enabled = parseBoolean(input.enabled);
  if (!isUuid(input.personId) || !isUuid(input.tagId) || enabled === null) {
    return null;
  }
  return { personId: input.personId, tagId: input.tagId, enabled };
}

export function validateReassignmentInput(input: {
  personId: string;
  staffUserId: string;
}): { personId: string; staffUserId: string } | null {
  if (!isUuid(input.personId) || !isUuid(input.staffUserId)) return null;
  return { personId: input.personId, staffUserId: input.staffUserId };
}

export function validateDoNotContactInput(input: {
  personId: string;
  enabled: string;
}): { personId: string; enabled: boolean } | null {
  const enabled = parseBoolean(input.enabled);
  if (!isUuid(input.personId) || enabled === null) return null;
  return { personId: input.personId, enabled };
}

export function validateTaskCompletionInput(input: {
  personId: string;
  taskId: string;
}): { personId: string; taskId: string } | null {
  if (!isUuid(input.personId) || !isUuid(input.taskId)) return null;
  return { personId: input.personId, taskId: input.taskId };
}

export function validateArchiveInput(input: {
  personId: string;
  confirmation: string;
}): { personId: string } | null {
  if (!isUuid(input.personId) || input.confirmation !== "ARCHIVE") return null;
  return { personId: input.personId };
}
