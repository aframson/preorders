import { LayoutDashboard, Package } from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/app/orders/actions";
import { myOrdersPath } from "@/lib/site";

export function ShopHeaderActions({
  dashboardHref = null,
  customerEmail = null,
}: {
  /** When the browser has a signed-in vendor session. */
  dashboardHref?: string | null;
  /** When the browser has a signed-in customer session (verified email). */
  customerEmail?: string | null;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {customerEmail && (
        <span className="hidden text-sm text-ink-muted sm:inline">
          Signed in as {customerEmail}
        </span>
      )}
      <Link
        href={myOrdersPath()}
        className="inline-flex h-9 items-center gap-1.5 rounded-control px-2.5 text-sm font-medium text-ink-muted hover:bg-surface-muted hover:text-ink"
      >
        <Package className="size-4" aria-hidden />
        My orders
      </Link>
      {customerEmail ? (
        <form action={signOutAction}>
          <button
            type="submit"
            className="hidden h-9 items-center rounded-control px-2.5 text-sm font-medium text-ink-muted hover:bg-surface-muted hover:text-ink sm:inline-flex"
          >
            Sign out
          </button>
        </form>
      ) : null}
      {dashboardHref ? (
        <Link
          href={dashboardHref}
          className="inline-flex h-9 items-center gap-1.5 rounded-control bg-brand-700 px-2.5 text-sm font-medium text-white hover:bg-brand-800"
        >
          <LayoutDashboard className="size-4" aria-hidden />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
      ) : null}
    </div>
  );
}
