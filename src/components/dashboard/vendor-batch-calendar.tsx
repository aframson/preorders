"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import type { DashboardBatch } from "@/lib/queries/dashboard";
import { BATCH_STATUS, type BatchStatus } from "@/lib/status";
import {
  accraWeekdayMondayFirst,
  daysInAccraMonth,
  fromAccraDateKey,
  getAccraParts,
  toAccraDateKey,
} from "@/lib/accra";
import { formatAccraDateTime } from "@/lib/time";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** Stable palette so each batch keeps a colour across the month. */
const BATCH_COLORS = [
  { bar: "bg-brand-600", text: "text-brand-700", soft: "bg-brand-50" },
  { bar: "bg-open", text: "text-open", soft: "bg-open-tint" },
  { bar: "bg-transit", text: "text-transit", soft: "bg-transit-tint" },
  { bar: "bg-arrived", text: "text-arrived", soft: "bg-arrived-tint" },
  { bar: "bg-closing", text: "text-closing", soft: "bg-closing-tint" },
  { bar: "bg-closed", text: "text-closed", soft: "bg-closed-tint" },
] as const;

type CalBatch = {
  id: string;
  dropId: string;
  label: string;
  status: BatchStatus;
  opensAt: string;
  closesAt: string;
  expectedDeliveryAt: string | null;
  colorIndex: number;
  startKey: string;
  endKey: string;
};

export type VendorCalendarBatch = Pick<
  DashboardBatch,
  | "id"
  | "dropId"
  | "dropTitle"
  | "number"
  | "status"
  | "opensAt"
  | "closesAt"
  | "expectedDeliveryAt"
>;

/**
 * Ops calendar: open windows, cutoffs, and collected / in-flight batches as
 * coloured spans — edge-flush tool chrome for the vendor home.
 */
export function VendorBatchCalendar({
  batches,
}: {
  batches: VendorCalendarBatch[];
}) {
  const now = getAccraParts(new Date());
  const [viewYear, setViewYear] = useState(now.year);
  const [viewMonth, setViewMonth] = useState(now.month);

  const calBatches = useMemo(() => {
    const sorted = [...batches].sort(
      (a, b) =>
        new Date(a.opensAt).getTime() - new Date(b.opensAt).getTime() ||
        a.number - b.number,
    );
    return sorted.map((batch, index): CalBatch => {
      const startKey = toAccraDateKey(batch.opensAt);
      const endKey = toAccraDateKey(
        batch.expectedDeliveryAt &&
          ["arrived", "freight_invoiced", "settled"].includes(batch.status)
          ? batch.expectedDeliveryAt
          : batch.closesAt,
      );
      return {
        id: batch.id,
        dropId: batch.dropId,
        label: `B${batch.number} · ${batch.dropTitle}`,
        status: batch.status,
        opensAt: batch.opensAt,
        closesAt: batch.closesAt,
        expectedDeliveryAt: batch.expectedDeliveryAt,
        colorIndex: index % BATCH_COLORS.length,
        startKey,
        endKey: endKey < startKey ? startKey : endKey,
      };
    });
  }, [batches]);

  const weeks = useMemo(
    () => buildWeeks(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const todayKey = toAccraDateKey(new Date());
  const monthStart = `${viewYear}-${String(viewMonth).padStart(2, "0")}-01`;
  const monthEnd = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(daysInAccraMonth(viewYear, viewMonth)).padStart(2, "0")}`;

  const visible = calBatches.filter(
    (batch) => batch.endKey >= monthStart && batch.startKey <= monthEnd,
  );

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

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3 lg:px-6">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
            Batch calendar · Accra
          </p>
          <h2 className="font-display text-lg font-semibold text-ink">
            {monthLabel}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="flex size-8 items-center justify-center text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              setViewYear(now.year);
              setViewMonth(now.month);
            }}
            className="px-2 py-1 text-xs font-medium text-brand-700 hover:text-brand-800"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="flex size-8 items-center justify-center text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </header>

      <div className="grid shrink-0 grid-cols-7 border-b border-border text-center text-[10px] font-medium tracking-wide text-ink-subtle uppercase">
        {WEEKDAYS.map((day) => (
          <div key={day} className="border-r border-border py-2 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {weeks.map((week, weekIndex) => {
          const spans = packWeekLanes(
            visible
              .map((batch) => {
                const range = clipSpanToWeek(batch.startKey, batch.endKey, week);
                if (!range) return null;
                return { batch, ...range };
              })
              .filter(Boolean) as {
              batch: CalBatch;
              startCol: number;
              span: number;
            }[],
          );

          const laneCount = spans.reduce(
            (max, item) => Math.max(max, item.lane + 1),
            0,
          );
          // Room for day number + stacked bars (mobile was crushing bars together).
          const barsHeight = laneCount > 0 ? laneCount * 22 + 4 : 0;
          const weekMinPx = Math.max(88, 32 + barsHeight);

          return (
            <div
              key={`week-${weekIndex}`}
              className="relative grid min-h-[5.5rem] flex-none grid-cols-7 border-b border-border xl:min-h-0 xl:flex-1"
              style={{ minHeight: weekMinPx }}
            >
              {week.map((day, col) => {
                if (!day) {
                  return (
                    <div
                      key={`pad-${weekIndex}-${col}`}
                      className="border-r border-border bg-surface-muted/40 last:border-r-0"
                    />
                  );
                }
                const key = day.key;
                const isToday = key === todayKey;
                const opens = calBatches.filter((b) => b.startKey === key);
                const closes = calBatches.filter(
                  (b) => toAccraDateKey(b.closesAt) === key,
                );

                return (
                  <div
                    key={key}
                    className={cn(
                      "relative h-full border-r border-border last:border-r-0",
                      isToday && "bg-brand-50/50",
                    )}
                  >
                    <div className="flex items-start justify-between px-1 pt-1 sm:px-1.5">
                      <span
                        className={cn(
                          "inline-flex size-5 items-center justify-center text-[11px] sm:size-6 sm:text-xs",
                          isToday
                            ? "bg-brand-700 font-semibold text-white"
                            : "text-ink-muted",
                        )}
                        data-numeric
                      >
                        {day.day}
                      </span>
                      <div className="flex flex-col items-end gap-0.5 pt-0.5">
                        {opens.length > 0 && (
                          <span
                            className="size-1.5 rounded-full bg-open"
                            title="Opens"
                          />
                        )}
                        {closes.length > 0 && (
                          <span
                            className="size-1.5 rounded-full bg-closing"
                            title="Closes"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="pointer-events-none absolute inset-x-0 top-7 bottom-1 px-0.5">
                {spans.map(({ batch, startCol, span, lane }) => {
                  const color = BATCH_COLORS[batch.colorIndex];
                  const closed = isClosedBatch(batch.status);
                  const shortLabel = `B${batch.label.replace(/^B(\d+).*$/, "$1")}`;
                  return (
                    <Link
                      key={batch.id}
                      href={`/dashboard/drops/${batch.dropId}/batches/${batch.id}`}
                      className={cn(
                        "pointer-events-auto absolute flex h-[18px] items-center truncate rounded-sm px-1 text-[9px] font-semibold sm:h-5 sm:px-1.5 sm:text-[10px] sm:font-medium",
                        closed
                          ? "bg-border-strong/35 text-ink-subtle"
                          : cn(color.bar, "text-white"),
                      )}
                      style={{
                        top: lane * 22,
                        left: `calc(${(startCol / 7) * 100}% + 1px)`,
                        width: `calc(${(span / 7) * 100}% - 2px)`,
                      }}
                      title={`${batch.label} · ${BATCH_STATUS[batch.status].label}`}
                    >
                      <span className="truncate sm:hidden">{shortLabel}</span>
                      <span className="hidden truncate sm:inline">
                        {batch.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-border px-5 py-3 lg:px-6">
        <p className="text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
          This month
        </p>
        {visible.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No batches on this month.</p>
        ) : (
          <ul className="mt-1.5 space-y-1">
            {visible.map((batch) => {
              const color = BATCH_COLORS[batch.colorIndex];
              const closed = isClosedBatch(batch.status);
              return (
                <li key={batch.id}>
                  <Link
                    href={`/dashboard/drops/${batch.dropId}/batches/${batch.id}`}
                    className={cn(
                      "flex items-start gap-2.5 transition-colors hover:bg-surface-muted",
                      closed && "opacity-40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 size-2.5 shrink-0",
                        closed ? "bg-border-strong" : color.bar,
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 py-0.5">
                      <span className="block truncate text-sm font-medium text-ink">
                        {batch.label}
                      </span>
                      <span className="block text-xs text-ink-muted">
                        {BATCH_STATUS[batch.status].label}
                        {" · "}
                        {batch.status === "scheduled"
                          ? `Opens ${formatAccraDateTime(batch.opensAt)}`
                          : batch.status === "open"
                            ? `Closes ${formatAccraDateTime(batch.closesAt)}`
                            : batch.status === "settled"
                              ? "Collected"
                              : `Closed ${formatAccraDateTime(batch.closesAt)}`}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-2 flex flex-wrap gap-3 border-t border-border pt-2 text-[10px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-open" /> Opens
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-closing" /> Closes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 bg-brand-600" /> Window
          </span>
        </div>
      </div>
    </div>
  );
}

type DayCell = { day: number; key: string } | null;

function buildWeeks(year: number, month: number): DayCell[][] {
  const firstKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const startPad = accraWeekdayMondayFirst(fromAccraDateKey(firstKey));
  const total = daysInAccraMonth(year, month);
  const days: DayCell[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let day = 1; day <= total; day++) {
    days.push({
      day,
      key: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    });
  }
  while (days.length % 7 !== 0) days.push(null);

  const weeks: DayCell[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function clipSpanToWeek(
  startKey: string,
  endKey: string,
  week: DayCell[],
): { startCol: number; span: number } | null {
  const keys = week.map((cell) => cell?.key ?? null);
  let startCol = -1;
  let endCol = -1;
  for (let i = 0; i < 7; i++) {
    const key = keys[i];
    if (!key) continue;
    if (key >= startKey && key <= endKey) {
      if (startCol === -1) startCol = i;
      endCol = i;
    }
  }
  if (startCol === -1 || endCol === -1) return null;
  return { startCol, span: endCol - startCol + 1 };
}

/**
 * Pack overlapping week spans into vertical lanes so bars never sit on top of
 * each other (especially on short mobile week rows).
 */
function packWeekLanes<
  T extends { startCol: number; span: number; batch: CalBatch },
>(spans: T[]): (T & { lane: number })[] {
  const sorted = [...spans].sort(
    (a, b) =>
      a.startCol - b.startCol ||
      b.span - a.span ||
      a.batch.label.localeCompare(b.batch.label),
  );

  const laneEnds: number[] = [];
  return sorted.map((item) => {
    const endCol = item.startCol + item.span;
    let lane = laneEnds.findIndex((end) => end <= item.startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(endCol);
    } else {
      laneEnds[lane] = endCol;
    }
    return { ...item, lane };
  });
}

function isClosedBatch(status: BatchStatus) {
  return status !== "open" && status !== "scheduled";
}
