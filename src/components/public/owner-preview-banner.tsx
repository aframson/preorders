import { Eye, LayoutDashboard } from "lucide-react";
import Link from "next/link";

/**
 * Shown only to the vendor who owns this exact shop, when they open their
 * own public link — the same URL a customer would be looking at. Without
 * this, there's nothing on the page itself to say "you're the owner
 * previewing" versus "you're a customer browsing," since the storefront
 * renders identically either way by design (it has to: that's what makes it
 * a true preview).
 */
export function OwnerPreviewBanner() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-200 bg-brand-50 px-5 py-2.5 text-sm dark:border-brand-800 dark:bg-brand-950/40">
      <p className="flex items-center gap-2 font-medium text-brand-800 dark:text-brand-200">
        <Eye className="size-4 shrink-0" aria-hidden />
        This is your live shop — what customers see when they open your link.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand-800 underline-offset-2 hover:underline dark:text-brand-200"
      >
        <LayoutDashboard className="size-4" aria-hidden />
        Back to dashboard
      </Link>
    </div>
  );
}
