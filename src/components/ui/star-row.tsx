import { Star } from "lucide-react";

import { cn } from "@/lib/cn";

/** Read-only star display — safe in server components. */
export function StarRow({
  value,
  size = "md",
}: {
  value: number;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            size === "sm" ? "size-3.5" : "size-4",
            star <= Math.round(value)
              ? "fill-closing text-closing"
              : "fill-transparent text-ink-subtle",
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}
