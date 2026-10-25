import { ArrowLeft, ExternalLink, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkReceivedButton } from "@/app/o/[token]/mark-received-button";
import { ButtonLink } from "@/components/ui/button";
import { MoneyRow } from "@/components/ui/money-row";
import { StatusPill } from "@/components/ui/status-pill";
import { requireVendor } from "@/lib/auth";
import { splitDeliveryNote } from "@/lib/maps-link";
import { formatGhs } from "@/lib/money";
import { formatLocalPhone } from "@/lib/phone";
import { getVendorOrder } from "@/lib/queries/order";
import { absoluteUrl, orderPath, whatsappChatLink } from "@/lib/site";
import { ORDER_STATUS, orderStatusLabel } from "@/lib/status";
import { BUCKETS, publicUrl } from "@/lib/storage";
import { formatAccraDate, formatAccraDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Order" };

export default async function VendorOrderPage({
  params,
}: PageProps<"/dashboard/orders/[orderId]">) {
  const { orderId } = await params;
  await requireVendor();

  const order = await getVendorOrder(orderId);
  if (!order) notFound();

  const { address: deliveryAddress, mapsUrl: deliveryMapsUrl } =
    splitDeliveryNote(order.deliveryNote ?? "");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Orders
        </Link>
        <ButtonLink
          href={absoluteUrl(orderPath(order.publicToken))}
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
          size="sm"
        >
          What the customer sees
          <ExternalLink className="size-3.5" aria-hidden />
        </ButtonLink>
      </div>

      <section className="space-y-1">
        <div className="flex items-center gap-2">
          <h1
            className="font-display text-2xl font-semibold tracking-tight text-ink"
            data-numeric
          >
            {order.code}
          </h1>
          <StatusPill tone={ORDER_STATUS[order.status].tone}>
            {orderStatusLabel(order.status, order.fulfilment, "vendor")}
          </StatusPill>
        </div>
        <p className="text-sm text-ink-muted">
          Batch {order.batch.number} &middot; placed{" "}
          {formatAccraDate(order.createdAt)}
        </p>
      </section>

      <section className="space-y-3 rounded-card border border-border bg-surface p-4 text-sm">
        <h2 className="font-display text-base font-semibold text-ink">
          Customer
        </h2>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-ink">{order.customer.name}</p>
            <p className="text-ink-muted" data-numeric>
              {formatLocalPhone(order.customer.phone)}
            </p>
            {order.customer.email && (
              <p className="text-ink-muted">{order.customer.email}</p>
            )}
          </div>
          <ButtonLink
            href={whatsappChatLink(
              order.customer.phone,
              `Hi ${order.customer.name.split(" ")[0]}, about your order ${order.code}`,
            )}
            variant="secondary"
            size="sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4" aria-hidden />
            Message
          </ButtonLink>
        </div>
      </section>

      {order.status === "freight_paid" && (
        <MarkReceivedButton
          token={order.publicToken}
          fulfilment={order.fulfilment}
          actor="vendor"
        />
      )}

      <section className="space-y-3">
        <h2 className="font-display text-base font-semibold text-ink">
          Items
        </h2>
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-3">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                {item.imagePath && (
                  <Image
                    src={publicUrl(BUCKETS.productImages, item.imagePath)}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {item.name}
                </p>
                {item.variantLabel && (
                  <p className="text-xs text-ink-muted">{item.variantLabel}</p>
                )}
              </div>
              <p className="shrink-0 text-sm text-ink-muted" data-numeric>
                {item.qty} &times; {formatGhs(item.unitPrice)}
              </p>
            </li>
          ))}
        </ul>

        <div className="space-y-3 rounded-card border border-border bg-surface p-4">
          <MoneyRow
            label={order.paidGoods ? "Goods (paid)" : "Goods (unpaid)"}
            amount={order.goodsTotal}
          />
          <MoneyRow
            label={
              order.freightActual === null
                ? "Shipping, not invoiced yet"
                : order.paidFreight || order.freightActual === 0
                  ? "Shipping (paid)"
                  : "Shipping (invoiced, unpaid)"
            }
            amount={order.freightActual ?? order.freightEstimate}
            muted={order.freightActual === null}
            hint={
              order.freightActual === null ? (
                <span className="ml-1 text-ink-subtle">estimate</span>
              ) : null
            }
          />
        </div>
      </section>

      <section className="space-y-3 rounded-card border border-border bg-surface p-4 text-sm">
        <h2 className="font-display text-base font-semibold text-ink">
          {order.fulfilment === "pickup" ? "Pickup" : "Delivery"}
        </h2>
        <p className="whitespace-pre-line text-ink-muted">
          {order.fulfilment === "pickup"
            ? order.deliveryNote
              ? "Your pickup pin."
              : "Customer is picking this up."
            : order.deliveryNote
              ? deliveryAddress || "No written address — pin only."
              : "No address given yet."}
        </p>
        {deliveryMapsUrl && (
          <a
            href={deliveryMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-700 underline-offset-2 hover:underline"
          >
            Open in Google Maps
          </a>
        )}
      </section>

      {order.timeline.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold text-ink">
            Timeline
          </h2>
          <ol className="space-y-3">
            {order.timeline.map((event) => (
              <li key={event.id} className="flex gap-3">
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-400"
                  aria-hidden
                />
                <div>
                  <p className="text-sm text-ink">
                    {event.message ?? event.type.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-ink-subtle">
                    {formatAccraDateTime(event.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {order.review && (
        <section className="space-y-2 rounded-card border border-border bg-surface p-4 text-sm">
          <h2 className="font-display text-base font-semibold text-ink">
            Customer review
          </h2>
          <p className="text-ink">{"★".repeat(order.review.rating)}</p>
          {order.review.comment && (
            <p className="text-ink-muted">{order.review.comment}</p>
          )}
        </section>
      )}
    </div>
  );
}
