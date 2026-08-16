import { cn } from "@/lib/cn";
import { SITE } from "@/lib/site";

/**
 * The mark is a stack of three bars: a batch, with the top one open. It reads
 * at 20px inside a WhatsApp link preview, which is the size that matters.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("size-6", className)}
    >
      <rect x="3" y="14.5" width="18" height="3.2" rx="1.6" fill="currentColor" opacity="0.35" />
      <rect x="3" y="9.4" width="18" height="3.2" rx="1.6" fill="currentColor" opacity="0.6" />
      <rect x="3" y="4.3" width="18" height="3.2" rx="1.6" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="size-6 text-brand-700" />
      <span className="font-display text-lg font-bold tracking-tight text-ink">
        {SITE.name}
      </span>
    </span>
  );
}
