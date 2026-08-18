/**
 * Accra-local calendar helpers used by CutoffCalendar and the vendor batch
 * calendar. Kept separate from the rest of `time.ts` so client bundles get a
 * small, stable surface.
 */

export type AccraParts = {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
};

type DateInput = Date | string;

function asDate(value: DateInput): Date {
  return typeof value === "string" ? new Date(value) : value;
}

const partsFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Accra",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Calendar parts in Africa/Accra for an instant. */
export function getAccraParts(date: DateInput): AccraParts {
  const parts = Object.fromEntries(
    partsFormat.formatToParts(asDate(date)).map((part) => [part.type, part.value]),
  );
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
  };
}

/** `YYYY-MM-DD` in Accra. */
export function toAccraDateKey(date: DateInput): string {
  const { year, month, day } = getAccraParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Instant at Accra local midnight for a calendar day. */
export function fromAccraDateKey(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

/** Build Accra `datetime-local` / date strings from parts. */
export function formatAccraLocal(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): string {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  const h = String(hour).padStart(2, "0");
  const min = String(minute).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function parseAccraLocal(value: string): AccraParts | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] ?? 0),
    minute: Number(match[5] ?? 0),
  };
}

/** Monday=0 … Sunday=6 for Accra calendar layouts. */
export function accraWeekdayMondayFirst(date: DateInput): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Accra",
    weekday: "short",
  }).format(asDate(date));
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[weekday] ?? 0;
}

export function daysInAccraMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
