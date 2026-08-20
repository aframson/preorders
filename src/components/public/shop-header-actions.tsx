"use client";

import { LayoutDashboard, Package } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { portalStorageKey } from "@/lib/customer-portal-storage";
import { customerPortalPath, vendorOrdersPath } from "@/lib/site";

export function ShopHeaderActions({
  vendorSlug,
  dashboardHref = null,
}: {
  vendorSlug: string;
  /** When the browser has a signed-in vendor session. */
  dashboardHref?: string | null;
}) {
  const [ordersHref, setOrdersHref] = useState(vendorOrdersPath(vendorSlug));

  useEffect(() => {
    try {
      const token = window.localStorage.getItem(portalStorageKey(vendorSlug));
      if (token) setOrdersHref(customerPortalPath(token));
    } catch {
      // keep find-orders fallback
    }
  }, [vendorSlug]);

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Link
        href={ordersHref}
        className="inline-flex h-9 items-center gap-1.5 rounded-control px-2.5 text-sm font-medium text-ink-muted hover:bg-surface-muted hover:text-ink"
      >
        <Package className="size-4" aria-hidden />
        Orders
      </Link>
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
