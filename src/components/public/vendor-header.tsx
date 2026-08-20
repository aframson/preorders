import { BadgeCheck, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { StarRow } from "@/components/ui/star-row";
import { BUCKETS, publicUrl } from "@/lib/storage";

/**
 * Compact, but it is what turns a stranger into someone willing to send money
 * to another stranger, so the delivery track record is stated plainly.
 */
export function VendorHeader({
  businessName,
  logoPath,
  batchesDelivered,
  ratingAverage = null,
  reviewCount = 0,
  description,
  href,
  actions,
}: {
  businessName: string;
  logoPath: string | null;
  batchesDelivered: number;
  ratingAverage?: number | null;
  reviewCount?: number;
  description?: string | null;
  href?: string;
  actions?: ReactNode;
}) {
  const identity = (
    <>
      <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 dark:bg-brand-950">
        {logoPath ? (
          <Image
            src={publicUrl(BUCKETS.vendorAssets, logoPath)}
            alt=""
            width={44}
            height={44}
            className="size-full object-cover"
          />
        ) : (
          <Store className="size-5 text-brand-700" aria-hidden />
        )}
      </div>

      <div className="min-w-0">
        <h1 className="flex items-center gap-1.5 truncate font-display text-base font-semibold text-ink">
          {businessName}
          {(batchesDelivered > 0 || reviewCount > 0) && (
            <BadgeCheck
              className="size-4 shrink-0 text-open"
              aria-label="Trusted seller"
            />
          )}
        </h1>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink-muted">
          {reviewCount > 0 && ratingAverage != null ? (
            <>
              <StarRow value={ratingAverage} size="sm" />
              <span data-numeric>
                {ratingAverage.toFixed(1)} · {reviewCount} review
                {reviewCount === 1 ? "" : "s"}
              </span>
              {batchesDelivered > 0 && (
                <span className="text-ink-subtle">
                  · {batchesDelivered} batch
                  {batchesDelivered === 1 ? "" : "es"} delivered
                </span>
              )}
            </>
          ) : batchesDelivered > 0 ? (
            <span>
              {batchesDelivered} batch{batchesDelivered === 1 ? "" : "es"}{" "}
              delivered
            </span>
          ) : (
            <span>{description ?? "New here"}</span>
          )}
        </div>
      </div>
    </>
  );

  return (
    <header className="border-b border-border px-5 py-4">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        {href ? (
          <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
            {identity}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">{identity}</div>
        )}
        {actions}
      </div>
    </header>
  );
}
