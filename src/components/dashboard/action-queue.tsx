import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";
import { TONE_CLASSES, type Tone } from "@/lib/status";

export type ActionItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  detail: string;
  href: string;
  tone: Tone;
};

/**
 * The screen vendors actually live on: everything that needs a decision,
 * ordered by how much it costs them to ignore it.
 */
export function ActionQueue({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface px-5 py-6 text-center">
        <p className="text-sm text-ink-muted">
          Nothing needs you right now. Go and post your link.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-muted"
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                TONE_CLASSES[item.tone],
              )}
            >
              <item.icon className="size-4" aria-hidden />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">
                {item.label}
              </span>
              <span className="block truncate text-xs text-ink-muted">
                {item.detail}
              </span>
            </span>

            <ChevronRight
              className="size-4 shrink-0 text-ink-subtle"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
