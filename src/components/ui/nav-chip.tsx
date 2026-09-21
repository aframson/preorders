"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { signalNavigationStart } from "@/lib/navigation-signal";

/**
 * Category / filter chip that shows a spinner while the App Router navigation
 * is pending (useful for ?category= soft navigations).
 */
export function NavChip({
  href,
  active,
  children,
  className,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-current={active ? "true" : undefined}
      aria-busy={pending || undefined}
      disabled={pending}
      onClick={() => {
        if (active) return;
        signalNavigationStart();
        startTransition(() => {
          router.push(href);
        });
      }}
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-control border px-3 text-sm shadow-sm transition-colors disabled:opacity-80",
        active
          ? "border-ink bg-ink font-medium text-ink-inverse"
          : "border-border bg-surface text-ink-muted hover:bg-surface-muted hover:text-ink",
        className,
      )}
    >
      {pending ? (
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
