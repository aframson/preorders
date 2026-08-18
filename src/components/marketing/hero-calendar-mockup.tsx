import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Extra trailing week so the grid runs long into the bottom fade. */
const DAYS = [
  null,
  null,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  28,
  29,
  30,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
];

const BARS = [
  { label: "B3 · Open", col: 2, span: 4, tone: "open" as const, faint: false },
  { label: "B2 · Closed", col: 0, span: 3, tone: "closed" as const, faint: true },
  { label: "B4 · Opens", col: 5, span: 2, tone: "brand" as const, faint: false },
];

/**
 * Marketing hero calendar — tilted ops board that animates in on first paint.
 */
export function HeroCalendarMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-t-[1.35rem] border border-b-0 border-border bg-surface",
        className,
      )}
    >
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
            Batch calendar · Accra
          </p>
          <p className="font-display text-lg font-semibold text-ink">
            September 2026
          </p>
        </div>
        <StatusPill tone="open" pulse>
          Live windows
        </StatusPill>
      </header>

      <div className="grid grid-cols-7 gap-px border-b border-border bg-border px-px pt-px">
        {WEEKDAYS.map((day, index) => (
          <div
            key={`${day}-${index}`}
            className="bg-surface py-2 text-center text-[10px] font-medium tracking-wide text-ink-subtle uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="relative grid grid-cols-7 gap-px bg-border p-px pb-16">
        {DAYS.map((day, index) => (
          <div
            key={`d-${index}`}
            className={cn(
              "min-h-[3.35rem] bg-surface px-1.5 pt-1",
              day === 18 && index < 35 && "bg-brand-50/70",
              !day && "bg-surface-muted/50",
              index >= 35 && "opacity-80",
            )}
          >
            {day ? (
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center text-xs",
                  day === 18 && index < 35
                    ? "bg-brand-700 font-semibold text-white"
                    : "text-ink-muted",
                )}
                data-numeric
              >
                {day}
              </span>
            ) : null}
          </div>
        ))}

        {/* Animated window bars across mid weeks */}
        <div className="pointer-events-none absolute inset-x-1 top-[28%] space-y-1.5">
          {BARS.map((bar, index) => (
            <div
              key={bar.label}
              className={cn(
                "hero-cal-bar flex h-5 items-center truncate px-2 text-[10px] font-medium",
                bar.tone === "open" && "bg-open text-white",
                bar.tone === "brand" && "bg-brand-600 text-white",
                bar.tone === "closed" && "bg-border-strong/30 text-ink-subtle",
                bar.faint && "opacity-45",
              )}
              style={{
                marginLeft: `calc(${(bar.col / 7) * 100}%)`,
                width: `calc(${(bar.span / 7) * 100}% - 4px)`,
                ["--bar-i" as string]: index,
              }}
            >
              {bar.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
