"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { formatRemaining, tickInterval } from "@/lib/time";

/**
 * Reschedules itself after every tick rather than using a fixed interval, so
 * the countdown steps up from minute to second precision on its own as the
 * cutoff approaches.
 */
function useRemaining(targetTime: number) {
  const [remaining, setRemaining] = useState(() => targetTime - Date.now());

  useEffect(() => {
    let timeout: number | undefined;

    const tick = () => {
      const next = targetTime - Date.now();
      setRemaining(next);

      const interval = tickInterval(next);
      if (interval > 0) timeout = window.setTimeout(tick, interval);
    };

    tick();
    return () => window.clearTimeout(timeout);
  }, [targetTime]);

  return remaining;
}

/**
 * Server and client render this a few milliseconds apart, which is exactly the
 * kind of difference React warns about. The mismatch is expected for a clock.
 */
export function Countdown({
  target,
  className,
}: {
  target: Date;
  className?: string;
}) {
  const remaining = useRemaining(target.getTime());

  return (
    <span
      data-numeric
      suppressHydrationWarning
      aria-live="polite"
      className={className}
    >
      {formatRemaining(remaining)}
    </span>
  );
}

type CountdownRingProps = {
  target: Date;
  /** When the batch opened, so the ring can show elapsed progress. */
  from: Date;
  className?: string;
  label?: string;
};

export function CountdownRing({
  target,
  from,
  className,
  label = "left",
}: CountdownRingProps) {
  const remaining = useRemaining(target.getTime());
  const total = Math.max(1, target.getTime() - from.getTime());
  const progress = Math.min(1, Math.max(0, 1 - remaining / total));

  const radius = 46;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className={cn("relative size-28", className)}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="6"
          className="stroke-border"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className="stroke-current transition-[stroke-dashoffset] duration-500"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          suppressHydrationWarning
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          data-numeric
          suppressHydrationWarning
          className="font-display text-lg font-semibold text-ink"
        >
          {formatRemaining(remaining)}
        </span>
        <span className="text-xs text-ink-muted">{label}</span>
      </div>
    </div>
  );
}
