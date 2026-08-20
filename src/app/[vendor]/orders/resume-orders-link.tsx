"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { portalStorageKey } from "@/lib/customer-portal-storage";
import { customerPortalPath } from "@/lib/site";

/** If this device already opened a portal for the vendor, offer a one-tap resume. */
export function ResumeOrdersLink({ vendorSlug }: { vendorSlug: string }) {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    try {
      const token = window.localStorage.getItem(portalStorageKey(vendorSlug));
      if (token) setHref(customerPortalPath(token));
    } catch {
      // ignore
    }
  }, [vendorSlug]);

  if (!href) return null;

  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-ink hover:bg-surface-muted"
    >
      <span>Continue to orders on this device</span>
      <ArrowRight className="size-4 shrink-0 text-brand-700" aria-hidden />
    </Link>
  );
}
