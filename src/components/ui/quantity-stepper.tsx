"use client";

import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/cn";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  className,
  label = "Quantity",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  className?: string;
  label?: string;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-control border border-border bg-surface",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
        className="flex size-11 items-center justify-center rounded-l-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <span
        data-numeric
        aria-live="polite"
        aria-label={`${label}: ${value}`}
        className="min-w-10 text-center text-sm font-medium"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
        className="flex size-11 items-center justify-center rounded-r-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
