import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Package } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { formatGhs } from "@/lib/money";
import { getCustomerPortal } from "@/lib/queries/customer-portal";
import { orderPath, vendorPath } from "@/lib/site";
import { ORDER_STATUS, orderStatusLabel } from "@/lib/status";
import { BUCKETS, publicUrl } from "@/lib/storage";
import { formatAccraDate } from "@/lib/time";

export const metadata = {
  title: "Your orders",
  robots: { index: false, follow: false },
};

export default async function CustomerPortalPage({
  params,
}: PageProps<"/c/[token]">) {
  const { token } = await params;
  const portal = await getCustomerPortal(token);
  if (!portal) notFound();

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-5 py-4">
          <Link
            href={vendorPath(portal.vendor.slug)}
            className="flex min-w-0 items-center gap-3"
          >
            {portal.vendor.logoPath ? (
              <Image
                src={publicUrl(BUCKETS.vendorAssets, portal.vendor.logoPath)}
                alt=""
                width={36}
                height={36}
                className="size-9 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
                {portal.vendor.businessName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">
                {portal.vendor.businessName}
              </p>
              <p className="truncate text-xs text-ink-muted">Your orders</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-5 py-6">
        <section className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Hi {portal.customerName.split(/\s+/)[0]}
          </h1>
          <p className="text-sm text-ink-muted">
            Every order you have with {portal.vendor.businessName}
            {portal.email ? (
              <>
                {" "}
                · <span className="text-ink-subtle">{portal.email}</span>
              </>
            ) : null}
            . Bookmark this page — the same link stays yours.
          </p>
        </section>

        {portal.orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="When you place an order, it will show up here."
          />
        ) : (
          <ul className="space-y-3">
            {portal.orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={orderPath(order.publicToken)}
                  className="flex items-start justify-between gap-4 rounded-card border border-border bg-surface px-4 py-4 transition-colors hover:border-brand-300"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink" data-numeric>
                      {order.code}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {order.dropTitle} · Batch {order.batchNumber}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-subtle">
                      {formatAccraDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusPill tone={ORDER_STATUS[order.status].tone}>
                      {orderStatusLabel(order.status, order.fulfilment, "public")}
                    </StatusPill>
                    <p
                      className="font-display text-sm font-semibold text-ink"
                      data-numeric
                    >
                      {formatGhs(order.goodsTotal)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
