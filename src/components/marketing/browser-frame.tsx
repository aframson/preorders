import { Lock } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Lightweight desktop browser chrome for marketing product peeks.
 */
export function BrowserFrame({
  url = "preorders.app/dashboard",
  children,
  className,
}: {
  url?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.1rem] border border-border-strong bg-surface-muted shadow-sheet",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2.5 sm:px-4">
        <div className="flex shrink-0 items-center gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-[#e5a39a]" />
          <span className="size-2.5 rounded-full bg-[#e5c98a]" />
          <span className="size-2.5 rounded-full bg-[#a8d4a2]" />
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center">
          <div className="flex w-full max-w-md items-center gap-1.5 rounded-control border border-border bg-surface-muted px-2.5 py-1.5 text-[11px] text-ink-muted sm:text-xs">
            <Lock className="size-3 shrink-0 text-ink-subtle" aria-hidden />
            <span className="truncate" data-numeric>
              {url}
            </span>
          </div>
        </div>

        <div className="hidden w-[52px] shrink-0 sm:block" aria-hidden />
      </div>

      <div className="bg-surface">{children}</div>
    </div>
  );
}
