import { Clock, MessageCircle, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { CopyButton } from "@/components/share/copy-button";
import { ButtonLink } from "@/components/ui/button";
import { MoneyRow } from "@/components/ui/money-row";
import { StatusPill } from "@/components/ui/status-pill";
import { mapsEmbedSrc } from "@/lib/maps-link";
import { formatGhs } from "@/lib/money";
import { settleFromCallback } from "@/lib/payments";
import { formatLocalPhone } from "@/lib/phone";
import { getOrderByToken } from "@/lib/queries/order";
import { absoluteUrl, customerPortalPath, dropPath, orderPath, whatsappChatLink } from "@/lib/site";
import { ORDER_STATUS, orderStatusLabel } from "@/lib/status";
import { BUCKETS, publicUrl } from "@/lib/storage";
import { formatAccraDate, formatAccraDateTime } from "@/lib/time";
import { ClearCartOnConfirm } from "./clear-cart";
import { MarkReceivedButton } from "./mark-received-button";
import { OrderFeedbackForm } from "./order-feedback-form";
import { OrderProgress } from "./order-progress";
import { PaymentPoller } from "./payment-poller";
import { ResumeFreightPay, ResumeGoodsPay } from "./pay-buttons";

export const metadata = {
  title: "Your order",
  // A tracking page carries a customer's name, phone and address.
  robots: { index: false, follow: false },
};

export default async function OrderPage({
  params,
  searchParams,
}: PageProps<"/o/[token]">) {
  const { token } = await params;
  const query = await searchParams;

  // Paystack appends `reference` (and `trxref`) to the callback URL. We also
  // used to pre-set `?reference=` ourselves, which produced a duplicate key —
  // Next then hands back `string[]`, and a naive `typeof === "string"` check
  // skipped settlement entirely.
  const reference = firstQueryValue(query.reference) ?? firstQueryValue(query.trxref);

  // Paystack sends the customer back here the moment they finish paying,
  // usually before the webhook lands. Verifying on arrival means the page they
  // are already looking at says "confirmed" instead of "awaiting payment".
  if (reference) await settleFromCallback(reference);

  const order = await getOrderByToken(token);
  if (!order) notFound();

  const link = absoluteUrl(orderPath(order.publicToken));
  const awaitingFreight =
    order.status === "awaiting_freight" && order.freightActual !== null;

  return (
    <div className="min-h-dvh bg-canvas">
      <ClearCartOnConfirm batchId={order.batch.id} />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3">
          <Link
            href={dropPath(order.vendor.slug, order.drop.slug)}
            className="flex items-center gap-2"
          >
            {order.vendor.logoPath ? (
              <Image
                src={publicUrl(BUCKETS.vendorAssets, order.vendor.logoPath)}
                alt=""
                width={32}
                height={32}
                className="size-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
                {order.vendor.businessName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="text-sm font-medium text-ink">
              {order.vendor.businessName}
            </span>
          </Link>

          <StatusPill tone={ORDER_STATUS[order.status].tone}>
            {orderStatusLabel(order.status, order.fulfilment, "public")}
          </StatusPill>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-8 px-5 py-6">
        <section className="space-y-1">
          <p className="text-sm text-ink-muted">Order</p>
          <div className="flex items-center gap-2">
            <h1
              className="font-display text-2xl font-bold tracking-tight text-ink"
              data-numeric
            >
              {order.code}
            </h1>
            <CopyButton
              value={link}
              label="Copy link"
              copiedLabel="Link copied"
            />
          </div>
          <p className="text-sm text-ink-muted">
            Batch {order.batch.number} &middot; placed{" "}
            {formatAccraDate(order.createdAt)}
          </p>
        </section>

        {order.status === "pending_payment" && (
          <PaymentPending
            amount={order.goodsTotal}
            holdExpiresAt={order.holdExpiresAt}
            token={order.publicToken}
            returning={Boolean(reference)}
          />
        )}

        {awaitingFreight && (
          <FreightDue
            amount={order.freightActual ?? 0}
            estimate={order.freightEstimate}
            token={order.publicToken}
          />
        )}

        <OrderProgress
          status={order.status}
          batchStatus={order.batch.status}
          expectedDeliveryAt={order.batch.expectedDeliveryAt}
          fulfilment={order.fulfilment}
        />

        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold text-ink">
            Updates
          </h2>

          {order.timeline.length === 0 ? (
            <p className="rounded-card border border-dashed border-border px-4 py-6 text-center text-sm text-ink-muted">
              {order.vendor.businessName} will post updates here as the batch
              moves.
            </p>
          ) : (
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
          )}
        </section>

        {order.status === "freight_paid" && (
          <MarkReceivedButton
            token={order.publicToken}
            fulfilment={order.fulfilment}
            actor="customer"
          />
        )}

        {order.status === "collected" && (
          <OrderFeedbackForm
            token={order.publicToken}
            existing={order.review}
          />
        )}

        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold text-ink">
            What you ordered
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
              label={order.paidGoods ? "Goods (paid)" : "Goods"}
              amount={order.goodsTotal}
            />
            <MoneyRow
              label={
                order.freightActual === null
                  ? "Shipping, later"
                  : order.paidFreight
                    ? "Shipping (paid)"
                    : "Shipping"
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
            Delivery
          </h2>
          <p className="text-ink-muted">
            {order.fulfilment === "pickup" ? (
              order.deliveryNote ? (
                <>
                  Pick up at this pin.{" "}
                  <a
                    href={order.deliveryNote}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-brand-700 underline-offset-2 hover:underline"
                  >
                    Open in Google Maps
                  </a>
                </>
              ) : (
                "You are picking this up."
              )
            ) : order.deliveryNote ? (
              <>
                Delivering to your Maps pin.{" "}
                <a
                  href={order.deliveryNote}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand-700 underline-offset-2 hover:underline"
                >
                  Open in Google Maps
                </a>
              </>
            ) : (
              "Delivering to: address to be confirmed"
            )}
          </p>
          {order.deliveryNote && (
            <DeliveryMapPreview link={order.deliveryNote} />
          )}
          <p className="text-ink-muted">
            {order.customer.name} &middot;{" "}
            <span data-numeric>{formatLocalPhone(order.customer.phone)}</span>
          </p>
        </section>

        {order.portalToken && (
          <section className="space-y-3 rounded-card border border-border bg-surface p-4">
            <h2 className="font-display text-base font-semibold text-ink">
              All your orders
            </h2>
            <p className="text-sm text-ink-muted">
              Same email keeps every order with {order.vendor.businessName} in
              one place. Bookmark it.
            </p>
            <ButtonLink
              href={customerPortalPath(order.portalToken)}
              variant="secondary"
              block
            >
              Open your orders hub
            </ButtonLink>
            {order.siblingOrders.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {order.siblingOrders.map((sibling) => (
                  <li key={sibling.publicToken}>
                    <Link
                      href={orderPath(sibling.publicToken)}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-surface-muted"
                    >
                      <span className="font-medium text-ink" data-numeric>
                        {sibling.code}
                      </span>
                      <StatusPill tone={ORDER_STATUS[sibling.status].tone}>
                        {ORDER_STATUS[sibling.status].publicLabel}
                      </StatusPill>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {order.vendor.whatsappNumber && (
          <ButtonLink
            href={whatsappChatLink(
              order.vendor.whatsappNumber,
              `Hi, I'm asking about order ${order.code}`,
            )}
            variant="secondary"
            block
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4" aria-hidden />
            Message {order.vendor.businessName}
          </ButtonLink>
        )}

        <footer className="flex flex-col items-center gap-2 pt-4 text-center">
          <Logo className="opacity-60" />
          <p className="text-xs text-ink-subtle">
            Keep this link — and your orders hub — to come back anytime.
          </p>
        </footer>
      </main>
    </div>
  );
}

function PaymentPending({
  amount,
  holdExpiresAt,
  token,
  returning,
}: {
  amount: number;
  holdExpiresAt: string | null;
  token: string;
  returning: boolean;
}) {
  return (
    <section className="space-y-3 rounded-card border border-closing/30 bg-closing-tint p-4">
      <p className="flex items-center gap-2 font-medium text-ink">
        <Clock className="size-4 text-closing" aria-hidden />
        {returning ? "Waiting for confirmation" : "Payment not received yet"}
      </p>
      <p className="text-sm leading-relaxed text-ink-muted">
        Your place is held{" "}
        {holdExpiresAt ? `until ${formatAccraDateTime(holdExpiresAt)}` : "briefly"}
        . Pay {formatGhs(amount)} to lock it in before the batch is bought.
      </p>
      {returning && <PaymentPoller pending />}
      <ResumeGoodsPay token={token} amount={amount} />
    </section>
  );
}

function FreightDue({
  amount,
  estimate,
  token,
}: {
  amount: number;
  estimate: number;
  token: string;
}) {
  const difference = amount - estimate;

  return (
    <section className="space-y-3 rounded-card border border-arrived/30 bg-arrived-tint p-4">
      <p className="flex items-center gap-2 font-medium text-ink">
        <Package className="size-4 text-arrived" aria-hidden />
        Your goods have landed
      </p>
      <p className="text-sm leading-relaxed text-ink-muted">
        Shipping for your share is {formatGhs(amount)}
        {difference !== 0 && (
          <>
            , {difference > 0 ? "up" : "down"} {formatGhs(Math.abs(difference))}{" "}
            on the {formatGhs(estimate)} estimate
          </>
        )}
        . Pay it and your parcel is released.
      </p>
      <ResumeFreightPay token={token} amount={amount} />
    </section>
  );
}

function DeliveryMapPreview({ link }: { link: string }) {
  const embedSrc = mapsEmbedSrc(link);
  if (!embedSrc) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="relative aspect-video w-full">
        <iframe
          title="Delivery location"
          src={embedSrc}
          className="absolute inset-0 size-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </div>
  );
}

function firstQueryValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === "string" && entry.length > 0);
    return first ?? null;
  }
  return null;
}