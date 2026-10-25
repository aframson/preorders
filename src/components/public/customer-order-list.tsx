import { ArrowRight, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/cn";
import { formatGhs, type Pesewas } from "@/lib/money";
import {
  portalActionHint,
  portalIsDone,
  portalNeedsAction,
  type PortalOrder,
} from "@/lib/queries/customer-portal";
import { orderPath } from "@/lib/site";
import { ORDER_STATUS, orderStatusLabel } from "@/lib/status";
import { BUCKETS, publicUrl } from "@/lib/storage";
import { formatAccraDate } from "@/lib/time";

/** Orders grouped the way a customer thinks about them: owe money, waiting, done. */
export function CustomerOrderList({
  orders,
  showVendor = false,
}: {
  orders: PortalOrder[];
  /** For lists spanning several shops. */
  showVendor?: boolean;
}) {
  const needsAction = orders.filter(portalNeedsAction);
  const inProgress = orders.filter((order) => !portalNeedsAction(order) && !portalIsDone(order));
  const done = orders.filter(portalIsDone);

  return (
    <div className="space-y-8">
      {needsAction.length > 0 && (
        <OrderSection
          title="Needs your action"
          hint="Pay to keep your place or release your parcel."
          orders={needsAction}
          tone="action"
          showVendor={showVendor}
        />
      )}
      {inProgress.length > 0 && (
        <OrderSection title="In progress" orders={inProgress} showVendor={showVendor} />
      )}
      {done.length > 0 && (
        <OrderSection title="Done" orders={done} tone="muted" showVendor={showVendor} />
      )}
    </div>
  );
}

function OrderSection({
  title,
  hint,
  orders,
  tone = "default",
  showVendor,
}: {
  title: string;
  hint?: string;
  orders: PortalOrder[];
  tone?: "action" | "default" | "muted";
  showVendor: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
        {hint && <p className="text-sm text-ink-muted">{hint}</p>}
      </div>
      <ul className="space-y-3">
        {orders.map((order) => (
          <li key={order.id}>
            <OrderCard order={order} tone={tone} showVendor={showVendor} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function amountDue(order: PortalOrder): Pesewas | null {
  if (order.status === "pending_payment") return order.goodsTotal;
  if (order.status === "awaiting_freight" && order.freightAmount != null) {
    return order.freightAmount;
  }
  return null;
}

function OrderCard({
  order,
  tone,
  showVendor,
}: {
  order: PortalOrder;
  tone: "action" | "default" | "muted";
  showVendor: boolean;
}) {
  const action = portalActionHint(order);
  const due = amountDue(order);
  const total = order.goodsTotal + (order.freightAmount ?? 0);

  return (
    <Link
      href={orderPath(order.publicToken)}
      className={cn(
        "block rounded-card border px-4 py-4 transition-colors",
        tone === "action"
          ? "border-closing/35 bg-closing-tint/40 hover:border-closing/60"
          : "border-border bg-surface hover:border-border-strong",
        tone === "muted" && "opacity-80 hover:opacity-100",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
          {order.thumbPath ? (
            <Image
              src={publicUrl(BUCKETS.productImages, order.thumbPath)}
              alt=""
              fill
              sizes="56px"
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
            <p className="min-w-0 font-medium text-ink">{order.itemsLabel}</p>
            <p className="shrink-0 font-display text-sm font-semibold text-ink" data-numeric>
              {formatGhs(due ?? total)}
            </p>
          </div>
          <p className="mt-0.5 truncate text-sm text-ink-muted">
            {showVendor && <span className="font-medium text-ink">{order.vendor.name} · </span>}
            {order.dropTitle} · Batch {order.batchNumber}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusPill tone={ORDER_STATUS[order.status].tone}>
              {orderStatusLabel(order.status, order.fulfilment, "public")}
            </StatusPill>
            <span className="text-xs text-ink-subtle" data-numeric>
              {order.code} · {formatAccraDate(order.createdAt)}
              {order.expectedDeliveryAt && !portalIsDone(order)
                ? ` · due ${formatAccraDate(order.expectedDeliveryAt)}`
                : null}
            </span>
          </div>

          {action && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
              {action}
              <ArrowRight className="size-3.5" aria-hidden />
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
