import { Check } from "lucide-react";

import { cn } from "@/lib/cn";
import { formatAccraDate } from "@/lib/time";

export type TimelineStep = {
  label: string;
  /** Set once the step has happened. Absent means it is still ahead. */
  at?: Date | null;
  note?: string;
};

/**
 * The customer-facing answer to "where is my order?". Every step that has
 * happened carries a real date, because a tick with no date reads as a
 * placeholder and generates exactly the WhatsApp message it was meant to stop.
 */
export function StepperTimeline({
  steps,
  className,
}: {
  steps: TimelineStep[];
  className?: string;
}) {
  const currentIndex = steps.findIndex((step) => !step.at);
  const activeIndex = currentIndex === -1 ? steps.length : currentIndex;

  return (
    <ol className={cn("relative space-y-0", className)}>
      {steps.map((step, index) => {
        const done = Boolean(step.at);
        const current = index === activeIndex;
        const last = index === steps.length - 1;

        return (
          <li key={step.label} className="relative flex gap-3 pb-6 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-6 left-[11px] h-full w-px",
                  done ? "bg-open" : "bg-border",
                )}
              />
            )}

            <span
              aria-hidden
              className={cn(
                "relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                done && "border-open bg-open text-white",
                current && !done && "border-transit bg-surface",
                !done && !current && "border-border bg-surface",
              )}
            >
              {done && <Check className="size-3.5" strokeWidth={3} />}
              {current && !done && (
                <span className="size-2 rounded-full bg-transit" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  done || current ? "text-ink" : "text-ink-subtle",
                )}
              >
                {step.label}
              </p>
              {step.at && (
                <p className="text-xs text-ink-muted" data-numeric>
                  {formatAccraDate(step.at)}
                </p>
              )}
              {step.note && (
                <p className="mt-0.5 text-xs text-ink-muted">{step.note}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
