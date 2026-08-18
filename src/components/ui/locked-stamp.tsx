import { Stamp } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Circular “Locked” stamp — same mark as the marketing batch-filling strip.
 */
export function LockedStamp({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "sm"
      ? "size-14"
      : size === "lg"
        ? "size-[4.5rem]"
        : "size-16";
  const icon = size === "sm" ? "size-3.5" : "size-4";
  const label =
    size === "sm" ? "text-[8px]" : size === "lg" ? "text-[9px]" : "text-[9px]";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        dims,
        className,
      )}
      aria-hidden
    >
      <span className="absolute inset-0 rounded-full border-2 border-dashed border-open/50" />
      <span className="flex h-[86%] w-[86%] flex-col items-center justify-center rounded-full border-2 border-open bg-open-tint px-2 text-open">
        <Stamp className={icon} aria-hidden />
        <span
          className={cn(
            "mt-0.5 font-bold tracking-wider uppercase",
            label,
          )}
        >
          Locked
        </span>
      </span>
    </div>
  );
}
