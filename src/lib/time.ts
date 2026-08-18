const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Countdown text that gets more precise as the deadline approaches. Seconds
 * only appear inside the final hour, where they create urgency; showing them
 * three days out would just be noise that repaints every second.
 */
export function formatRemaining(ms: number): string {
  if (ms <= 0) return "Closed";

  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);
  const seconds = Math.floor((ms % MINUTE) / SECOND);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/** How often the countdown needs to repaint, given how much time is left. */
export function tickInterval(ms: number): number {
  if (ms <= 0) return 0;
  return ms < HOUR ? SECOND : MINUTE;
}

const dateFormat = new Intl.DateTimeFormat("en-GH", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Africa/Accra",
});

const dayFormat = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Accra",
});

/**
 * Timestamps arrive from Postgres as ISO strings, so both formatters take
 * either rather than forcing a `new Date()` at every call site.
 */
export type DateInput = Date | string;

function asDate(value: DateInput): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/** Everything customer-facing is stated in Ghana time, never the viewer's. */
export function formatAccraDateTime(date: DateInput): string {
  return dateFormat.format(asDate(date));
}

export function formatAccraDate(date: DateInput): string {
  return dayFormat.format(asDate(date));
}

const inputFormat = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Africa/Accra",
});

/**
 * `YYYY-MM-DDTHH:mm` in Accra time, which is what `datetime-local` expects.
 *
 * Cutoffs are always quoted in Ghana time regardless of where the vendor
 * happens to be, so this deliberately ignores the viewer's locale.
 */
export function toAccraInputValue(date: Date): string {
  const parts = Object.fromEntries(
    inputFormat.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}

/**
 * Interpret a `datetime-local` value as Accra time and return the instant.
 * Ghana runs at UTC+0 year round with no daylight saving, so the offset is
 * fixed and the value can be read straight as UTC.
 */
export function fromAccraInputValue(value: string): Date {
  return new Date(`${value}:00Z`);
}

/** A sensible default cutoff: 6pm Accra time, `days` from now. */
export function defaultCutoff(days: number): Date {
  const target = new Date(Date.now() + days * DAY);
  const [datePart] = toAccraInputValue(target).split("T");
  return new Date(`${datePart}T18:00:00Z`);
}

/**
 * Delivery dates are estimates measured in weeks, so quoting an exact day
 * invites arguments the vendor cannot win. "Late September" is honest.
 */
export function formatDeliveryWindow(date: DateInput): string {
  const value = asDate(date);
  const month = new Intl.DateTimeFormat("en-GH", {
    month: "long",
    timeZone: "Africa/Accra",
  }).format(value);
  const day = Number(
    new Intl.DateTimeFormat("en-GH", {
      day: "numeric",
      timeZone: "Africa/Accra",
    }).format(value),
  );

  if (day <= 10) return `early ${month}`;
  if (day <= 20) return `mid ${month}`;
  return `late ${month}`;
}

// Accra calendar helpers live in `./accra` for a stable client import surface.
export {
  type AccraParts,
  getAccraParts,
  toAccraDateKey,
  fromAccraDateKey,
  formatAccraLocal,
  parseAccraLocal,
  accraWeekdayMondayFirst,
  daysInAccraMonth,
} from "./accra";

