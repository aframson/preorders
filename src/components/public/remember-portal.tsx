"use client";

import { useEffect } from "react";

import { portalStorageKey } from "@/lib/customer-portal-storage";

/** Remembers the customer portal so "My orders" on the shop can deep-link back. */
export function RememberPortal({
  vendorSlug,
  portalToken,
}: {
  vendorSlug: string;
  portalToken: string;
}) {
  useEffect(() => {
    try {
      window.localStorage.setItem(portalStorageKey(vendorSlug), portalToken);
    } catch {
      // Private browsing may block storage.
    }
  }, [vendorSlug, portalToken]);

  return null;
}
