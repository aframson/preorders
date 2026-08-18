import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Package } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import { formatGhs, type Pesewas } from "@/lib/money";
import {
  getCustomerPortal,
  portalActionHint,
  portalIsDone,
  portalNeedsAction,
  type PortalOrder,
} from "@/lib/queries/customer-portal";
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

  const needsAction = portal.orders.filter(portalNeedsAction);
  const inProgress = portal.orders.filter(
    (order) => !portalNeedsAction(order) && !portalIsDone(order),
  );
  const done = portal.orders.filter(portalIsDone);
  const shopHref = vendorPath(portal.vendor.slug);

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-5 py-4">
          <Link
            href={shopHref}
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

      <main className="mx-auto max-w-lg space-y-8 px-5 py-6">
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
          <>
            {needsAction.length > 0 && (
              <OrderSection
                title="Needs your action"
                hint="Pay to keep your place or release your parcel."
                orders={needsAction}
                emphasize
              />
            )}

            {inProgress.length > 0 && (
              <OrderSection
                title="In progress"
                orders={inProgress}
              />
            )}

            {done.length > 0 && (
              <OrderSection
                title="Done"
                orders={done}
                muted
              />
            )}
          </>
        )}

        <section className="space-y-3 border-t border-border pt-6">
          <ButtonLink href={shopHref} variant="secondary" block>
            Shop {portal.vendor.businessName} again
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </section>
      </main>
    </div>
  );
}

function OrderSection({
  title,
  hint,
  orders,
  emphasize = false,
  muted = false,
}: {
  title: string;
  hint?: string;
  orders: PortalOrder[];
  emphasize?: boolean;
  muted?: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h2 className="font-display text-base font-semibold text-ink">
          {title}
        </h2>
        {hint ? <p className="text-sm text-ink-muted">{hint}</p> : null}
      </div>
      <ul className="space-y-3">
        {orders.map((order) => (
          <li key={order.id}>
            <OrderRow order={order} emphasize={emphasize} muted={muted} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function OrderRow({
  order,
  emphasize,
  muted,
}: {
  order: PortalOrder;
  emphasize: boolean;
  muted: boolean;
}) {
  const action = portalActionHint(order);
  const amountDue = actionAmount(order);
  const href = orderPath(order.publicToken);

  return (
    <Link
      href={href}
      className={
        emphasize
          ? "block rounded-card border border-closing/35 bg-closing-tint/40 px-4 py-4 transition-colors hover:border-closing/55"
          : muted
            ? "block rounded-card border border-border bg-surface px-4 py-4 opacity-80 transition-opacity hover:opacity-100"
            : "block rounded-card border border-border bg-surface px-4 py-4 transition-colors hover:border-brand-300"
      }
    >
      <div className="flex items-start gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
          {order.thumbPath ? (
            <Image
              src={publicUrl(BUCKETS.productImages, order.thumbPath)}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-ink-subtle">
              <Package className="size-5" aria-hidden />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-ink" data-numeric>
                {order.code}
              </p>
              <p className="mt-0.5 truncate text-sm text-ink-muted">
                {order.dropTitle} · Batch {order.batchNumber}
              </p>
              <p className="mt-0.5 text-xs text-ink-subtle">
                {formatAccraDate(order.createdAt)}
                {order.expectedDeliveryAt && !portalIsDone(order)
                  ? ` · due ${formatAccraDate(order.expectedDeliveryAt)}`
                  : null}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <StatusPill tone={ORDER_STATUS[order.status].tone}>
                {orderStatusLabel(order.status, order.fulfilment, "public")}
              </StatusPill>
              <p
                className="font-display text-sm font-semibold text-ink"
                data-numeric
              >
                {formatGhs(
                  amountDue ??
                    (order.freightAmount != null
                      ? order.goodsTotal + order.freightAmount
                      : order.goodsTotal),
                )}
              </p>
            </div>
          </div>

          {action ? (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800">
              {action}
              {amountDue != null ? (
                <span data-numeric>· {formatGhs(amountDue)}</span>
              ) : null}
              <ArrowRight className="size-3.5" aria-hidden />
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function actionAmount(order: PortalOrder): Pesewas | null {
  if (order.status === "pending_payment") return order.goodsTotal;
  if (order.status === "awaiting_freight" && order.freightAmount != null) {
    return order.freightAmount;
  }
  return null;
}
