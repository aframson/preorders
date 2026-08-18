"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import {
  daysInAccraMonth,
  formatAccraLocal,
  fromAccraDateKey,
  getAccraParts,
  parseAccraLocal,
  toAccraDateKey,
  accraWeekdayMondayFirst,
} from "@/lib/accra";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

type Mode = "datetime" | "date";

/**
 * Cal.com-style Accra calendar for batch cutoffs and expected-delivery days.
 * Writes the same Accra local strings the forms already submit.
 */
export function CutoffCalendar({
  id,
  name,
  value,
  defaultValue,
  onChange,
  mode = "datetime",
  required,
  className,
}: {
  id?: string;
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (next: string) => void;
  mode?: Mode;
  required?: boolean;
  className?: string;
}) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(
    () => value ?? defaultValue ?? (required ? toAccraInputFallback(mode) : ""),
  );
  const current = controlled ? (value ?? "") : internal;

  const parsed = parseAccraLocal(current);
  const fallback = getAccraParts(new Date());
  const parts = parsed ?? fallback;

  const [viewYear, setViewYear] = useState(parts.year);
  const [viewMonth, setViewMonth] = useState(parts.month);

  const cells = useMemo(
    () => buildMonthCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const todayKey = toAccraDateKey(new Date());
  const selectedKey = parsed
    ? `${parsed.year}-${String(parsed.month).padStart(2, "0")}-${String(parsed.day).padStart(2, "0")}`
    : null;

  function commit(next: string) {
    if (!controlled) setInternal(next);
    onChange?.(next);
  }

  function selectDay(year: number, month: number, day: number) {
    if (mode === "date") {
      commit(
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      );
      return;
    }
    const hour = parsed?.hour ?? 18;
    const minute = parsed?.minute ?? 0;
    commit(formatAccraLocal(year, month, day, hour, minute));
  }

  function setTime(hour: number, minute: number) {
    const year = parsed?.year ?? fallback.year;
    const month = parsed?.month ?? fallback.month;
    const day = parsed?.day ?? fallback.day;
    commit(formatAccraLocal(year, month, day, hour, minute));
  }

  function shiftMonth(delta: number) {
    const date = new Date(Date.UTC(viewYear, viewMonth - 1 + delta, 1));
    setViewYear(date.getUTCFullYear());
    setViewMonth(date.getUTCMonth() + 1);
  }

  const monthLabel = new Intl.DateTimeFormat("en-GH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(viewYear, viewMonth - 1, 1)));

  const formValue =
    mode === "date"
      ? (selectedKey ?? "")
      : parsed
        ? formatAccraLocal(
            parsed.year,
            parsed.month,
            parsed.day,
            parsed.hour,
            parsed.minute,
          )
        : "";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-control border border-border bg-surface",
        className,
      )}
    >
      <input
        id={id}
        type="hidden"
        name={name}
        value={formValue}
        required={required}
        readOnly
      />

      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="flex size-8 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <p className="font-display text-sm font-semibold text-ink">{monthLabel}</p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="flex size-8 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px px-2 pt-2 text-center text-[10px] font-medium tracking-wide text-ink-subtle uppercase">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px p-2">
        {cells.map((cell, index) => {
          if (!cell) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }
          const key = `${cell.year}-${String(cell.month).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
          const selected = key === selectedKey;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => selectDay(cell.year, cell.month, cell.day)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-control text-sm transition-colors",
                selected
                  ? "bg-brand-700 font-semibold text-white"
                  : isToday
                    ? "bg-brand-50 font-medium text-brand-800"
                    : "text-ink hover:bg-surface-muted",
              )}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      {mode === "datetime" && (
        <div className="flex items-center gap-2 border-t border-border bg-surface-muted/60 px-3 py-2.5">
          <p className="text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
            Accra
          </p>
          <select
            aria-label="Hour"
            className="h-9 flex-1 rounded-control border border-border bg-surface px-2 text-sm"
            value={parsed?.hour ?? 18}
            onChange={(event) =>
              setTime(Number(event.target.value), parsed?.minute ?? 0)
            }
          >
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {String(hour).padStart(2, "0")}
              </option>
            ))}
          </select>
          <span className="text-ink-muted" aria-hidden>
            :
          </span>
          <select
            aria-label="Minute"
            className="h-9 flex-1 rounded-control border border-border bg-surface px-2 text-sm"
            value={snapMinute(parsed?.minute ?? 0)}
            onChange={(event) =>
              setTime(parsed?.hour ?? 18, Number(event.target.value))
            }
          >
            {MINUTES.map((minute) => (
              <option key={minute} value={minute}>
                {String(minute).padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs text-ink-muted">
        <p>
          {mode === "date"
            ? selectedKey
              ? `Selected · ${selectedKey}`
              : "No date selected"
            : formValue
              ? `Closes ${formValue.replace("T", " ")} Accra`
              : "Pick a day and time"}
        </p>
        {mode === "date" && !required && selectedKey && (
          <button
            type="button"
            className="font-medium text-brand-700 hover:text-brand-800"
            onClick={() => commit("")}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function snapMinute(minute: number): number {
  if (MINUTES.includes(minute)) return minute;
  return MINUTES.reduce((best, candidate) =>
    Math.abs(candidate - minute) < Math.abs(best - minute) ? candidate : best,
  );
}

function toAccraInputFallback(mode: Mode): string {
  const parts = getAccraParts(new Date());
  if (mode === "date") {
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  }
  return formatAccraLocal(parts.year, parts.month, parts.day, 18, 0);
}

function buildMonthCells(year: number, month: number) {
  const firstKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const startPad = accraWeekdayMondayFirst(fromAccraDateKey(firstKey));
  const total = daysInAccraMonth(year, month);
  const cells: ({ year: number; month: number; day: number } | null)[] = [];

  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let day = 1; day <= total; day++) {
    cells.push({ year, month, day });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
