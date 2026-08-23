const NEW_YORK_TIME_ZONE = "America/New_York";

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

type DayRange = {
  startIso: string;
  endIso: string;
};

const datePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: NEW_YORK_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

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

  if (!value) {
    throw new Error(`Missing ${type} while resolving New York date boundaries.`);
  }

  return Number(value);
}

function getNewYorkCalendarDate(date: Date): CalendarDate {
  const parts = datePartsFormatter.formatToParts(date);

  return {
    year: getPart(parts, "year"),
    month: getPart(parts, "month"),
    day: getPart(parts, "day"),
  };
}

function getNewYorkOffsetMs(date: Date) {
  const parts = dateTimePartsFormatter.formatToParts(date);
  const asUtc = Date.UTC(
    getPart(parts, "year"),
    getPart(parts, "month") - 1,
    getPart(parts, "day"),
    getPart(parts, "hour"),
    getPart(parts, "minute"),
    getPart(parts, "second"),
  );

  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function newYorkMidnightUtc(calendarDate: CalendarDate) {
  const desiredWallClock = Date.UTC(
    calendarDate.year,
    calendarDate.month - 1,
    calendarDate.day,
  );

  let candidate = new Date(desiredWallClock);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    candidate = new Date(desiredWallClock - getNewYorkOffsetMs(candidate));
  }

  return candidate;
}

function nextCalendarDate(calendarDate: CalendarDate): CalendarDate {
  const next = new Date(
    Date.UTC(calendarDate.year, calendarDate.month - 1, calendarDate.day + 1),
  );

  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

export function getNewYorkDayRange(now: Date = new Date()): DayRange {
  const calendarDate = getNewYorkCalendarDate(now);

  return {
    startIso: newYorkMidnightUtc(calendarDate).toISOString(),
    endIso: newYorkMidnightUtc(nextCalendarDate(calendarDate)).toISOString(),
  };
}
