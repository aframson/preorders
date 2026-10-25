import { Clock, ListOrdered, MessageCircle, Package } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { RememberOrder } from "@/components/public/remember-order";
import { CopyButton } from "@/components/share/copy-button";
import { ButtonLink } from "@/components/ui/button";
import { MoneyRow } from "@/components/ui/money-row";
import { StatusPill } from "@/components/ui/status-pill";
import { mapsEmbedSrc, splitDeliveryNote } from "@/lib/maps-link";
import { formatGhs } from "@/lib/money";
import { settleFromCallback } from "@/lib/payments";
import { formatLocalPhone } from "@/lib/phone";
import { getOrderByToken } from "@/lib/queries/order";
import { getOrderShareCard } from "@/lib/queries/order-share-card";
import {
  absoluteUrl,
  dropPath,
  orderPath,
  myOrdersPath,
  whatsappChatLink,
} from "@/lib/site";
import { ORDER_STATUS, orderStatusLabel } from "@/lib/status";
import { BUCKETS, publicUrl } from "@/lib/storage";
import { formatAccraDate, formatAccraDateTime } from "@/lib/time";
import { ClearCartOnConfirm } from "./clear-cart";
import { MarkReceivedButton } from "./mark-received-button";
import { OrderFeedbackForm } from "./order-feedback-form";
import { OrderProgress } from "./order-progress";
import { PaymentPoller } from "./payment-poller";
import { ResumeFreightPay, ResumeGoodsPay } from "./pay-buttons";

export async function generateMetadata({
  params,
}: PageProps<"/o/[token]">): Promise<Metadata> {
  const { token } = await params;
  const card = await getOrderShareCard(token).catch(() => null);

  const title = card?.code ?? "Your order";
  const description = card
    ? `${card.statusLabel} · ${card.vendorName} · ${card.dropTitle} · Batch ${card.batchNumber}`
    : "Track your preorder";

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

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
  // Pickup notes are always a bare vendor-set Maps link; delivery notes may now
  // be a written address with an optional pin appended — this handles both.
  const { address: deliveryAddress, mapsUrl: deliveryMapsUrl } =
    splitDeliveryNote(order.deliveryNote ?? "");

  const shippingSettled = order.paidFreight || order.freightActual === 0;
  const shippingAmount = order.freightActual ?? order.freightEstimate;
  const [latestUpdates, olderUpdates] = [
    order.timeline.slice(0, 3),
    order.timeline.slice(3),
  ];

  return (
    <div className="min-h-dvh bg-canvas">
      <ClearCartOnConfirm batchId={order.batch.id} />
      <RememberOrder token={order.publicToken} />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-5 py-3">
          <Link
            href={dropPath(order.vendor.slug, order.drop.slug)}
            className="flex min-w-0 items-center gap-2"
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
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
                {order.vendor.businessName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="truncate text-sm font-medium text-ink">
              {order.vendor.businessName}
            </span>
          </Link>

          <Link
            href={myOrdersPath()}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control px-2.5 text-sm font-medium text-ink-muted hover:bg-surface-muted hover:text-ink"
          >
            <ListOrdered className="size-4" aria-hidden />
            My orders
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-8 px-5 py-6">
        <section className="space-y-2">
          <StatusPill tone={ORDER_STATUS[order.status].tone}>
            {orderStatusLabel(order.status, order.fulfilment, "public")}
          </StatusPill>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1
              className="font-display text-2xl font-semibold tracking-tight text-ink"
              data-numeric
            >
              Order {order.code}
            </h1>
            <CopyButton
              value={link}
              label="Copy link"
              copiedLabel="Copied"
              variant="ghost"
              size="sm"
            />
          </div>
          <p className="text-sm text-ink-muted">
            {order.drop.title} &middot; Batch {order.batch.number} &middot; placed{" "}
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
            <>
              <UpdateList events={latestUpdates} />
              {olderUpdates.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer list-none text-sm font-medium text-ink-muted hover:text-ink">
                    <span className="group-open:hidden">
                      Show {olderUpdates.length} earlier update{olderUpdates.length === 1 ? "" : "s"}
                    </span>
                    <span className="hidden group-open:inline">Hide earlier updates</span>
                  </summary>
                  <div className="mt-3">
                    <UpdateList events={olderUpdates} />
                  </div>
                </details>
              )}
            </>
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
            Your order
          </h2>

          <div className="rounded-card border border-border bg-surface">
            <ul className="divide-y divide-border">
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
                      {item.qty > 1 && `${item.qty}× `}
                      {item.name}
                    </p>
                    {item.variantLabel && (
                      <p className="text-xs text-ink-muted">{item.variantLabel}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm text-ink" data-numeric>
                    {formatGhs(item.unitPrice * item.qty)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="space-y-2.5 border-t border-border p-4">
              <MoneyRow
                label="Goods"
                amount={order.goodsTotal}
                hint={<PaidTag paid={order.paidGoods} />}
              />
              <MoneyRow
                label={order.freightActual === null ? "Shipping (estimate)" : "Shipping"}
                amount={shippingAmount}
                muted={order.freightActual === null}
                hint={
                  order.freightActual === null ? (
                    <span className="ml-1.5 text-xs text-ink-subtle">billed when it lands</span>
                  ) : (
                    // A zero share has nothing to pay, so it's settled the
                    // moment it's invoiced — never shows up in `payments`.
                    <PaidTag paid={shippingSettled} />
                  )
                }
              />
              <MoneyRow
                label={order.freightActual === null ? "Estimated total" : "Total"}
                amount={order.goodsTotal + shippingAmount}
                strong
                className="border-t border-border pt-2.5"
              />
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-card border border-border bg-surface p-4 text-sm">
          <h2 className="font-display text-base font-semibold text-ink">
            {order.fulfilment === "pickup" ? "Pickup" : "Delivery"}
          </h2>
          <p className="whitespace-pre-line text-ink-muted">
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
                {deliveryAddress || "Delivering to your shared location."}
                {deliveryMapsUrl && (
                  <>
                    {" "}
                    <a
                      href={deliveryMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-brand-700 underline-offset-2 hover:underline"
                    >
                      Open in Google Maps
                    </a>
                  </>
                )}
              </>
            ) : (
              "Delivering to: address to be confirmed"
            )}
          </p>
          {deliveryMapsUrl && <DeliveryMapPreview link={deliveryMapsUrl} />}
          <p className="text-ink-muted">
            {order.customer.name} &middot;{" "}
            <span data-numeric>{formatLocalPhone(order.customer.phone)}</span>
          </p>
        </section>

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
          <p className="max-w-xs text-xs leading-relaxed text-ink-subtle">
            This order is saved on this phone. Tap <strong className="font-medium">Orders</strong> in{" "}
            {order.vendor.businessName}&apos;s shop to find it again
            {order.customer.email ? ", or use the link we emailed you" : ""}.
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
        {/* Comparing against a ₵0 estimate ("up ₵0.10 on ₵0.00") reads as noise. */}
        {estimate > 0 && difference !== 0 && (
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

function UpdateList({
  events,
}: {
  events: { id: string; type: string; message: string | null; createdAt: string }[];
}) {
  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="flex gap-3">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-400" aria-hidden />
          <div>
            <p className="text-sm text-ink">{event.message ?? event.type.replace(/_/g, " ")}</p>
            <p className="text-xs text-ink-subtle">{formatAccraDateTime(event.createdAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function PaidTag({ paid }: { paid: boolean }) {
  return paid ? (
    <span className="ml-1.5 rounded-full bg-open-tint px-1.5 py-0.5 text-[11px] font-medium text-open">
      Paid
    </span>
  ) : (
    <span className="ml-1.5 rounded-full bg-closing-tint px-1.5 py-0.5 text-[11px] font-medium text-closing">
      Due
    </span>
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