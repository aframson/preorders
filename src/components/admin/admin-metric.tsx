import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

export function AdminMetric({
  icon: Icon,
  label,
  value,
  hint,
  negative = false,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  /** For a figure that's gone below zero, e.g. a net loss. */
  negative?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-card border border-border bg-surface p-4", className)}>
      <Icon className="size-4 text-ink-muted" aria-hidden />
      <p className="mt-3 text-xs text-ink-muted">{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate font-display text-lg font-semibold",
          negative ? "text-danger" : "text-ink",
        )}
        data-numeric
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}
