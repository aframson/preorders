import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RecheckPaymentButton } from "@/components/admin/fix-buttons";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { MoneyRow } from "@/components/ui/money-row";
import { StatusPill } from "@/components/ui/status-pill";
import { splitDeliveryNote } from "@/lib/maps-link";
import { formatGhs } from "@/lib/money";
import { PAYMENT_STATUS, PAYMENT_TYPE_LABEL } from "@/lib/payment-status";
import { summarisePaystackRaw } from "@/lib/paystack-raw";
import { getAdminOrder, type AdminOrderDetail } from "@/lib/queries/admin-orders";
import { BATCH_STATUS, ORDER_STATUS } from "@/lib/status";
import { formatAccraDateTime } from "@/lib/time";

export const metadata = { title: "Order · Admin" };

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) notFound();

  const order = await getAdminOrder(orderId);
  if (!order) notFound();

  const status = ORDER_STATUS[order.status];
  const delivery = order.deliveryNote ? splitDeliveryNote(order.deliveryNote) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden />
          Orders
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink" data-numeric>
                {order.code}
              </h1>
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              <Link href={`/admin/vendors/${order.batch.vendor.id}`} className="hover:underline">
                {order.batch.vendor.name}
              </Link>{" "}
              · {order.batch.dropTitle} · Batch {order.batch.number}
            </p>
          </div>
          <Link
            href={`/o/${order.publicToken}`}
            target="_blank"
            className="inline-flex h-10 items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-muted"
          >
            What the customer sees
            <ExternalLink className="size-4" aria-hidden />
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Customer" />
          <CardBody>
            <Details
              rows={[
                ["Name", order.customer?.name ?? "Unknown"],
                ["Phone", order.customer?.phone ?? "—"],
                ["Email", order.customer?.email ?? "—"],
                ["Fulfilment", order.fulfilment === "delivery" ? "Delivery" : "Pickup"],
                ...(delivery
                  ? ([
                      ["Address", delivery.address || "—"],
                      ["Map pin", delivery.mapsUrl ? "Attached" : "None"],
                    ] as [string, string][])
                  : []),
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Batch" />
          <CardBody>
            <Details
              rows={[
                ["Status", BATCH_STATUS[order.batch.status].label],
                ["Opened", formatAccraDateTime(order.batch.opensAt)],
                ["Cutoff", formatAccraDateTime(order.batch.closesAt)],
                ["Closed", order.batch.closedAt ? formatAccraDateTime(order.batch.closedAt) : "—"],
                [
                  "Shipping finalised",
                  order.batch.freightFinalisedAt ? formatAccraDateTime(order.batch.freightFinalisedAt) : "Not yet",
                ],
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Money" />
          <CardBody className="space-y-2">
            <MoneyRow label="Goods" amount={order.goodsTotal} strong />
            <MoneyRow label="Shipping estimate at checkout" amount={order.freightEstimate} muted />
            {order.freightAmount !== null && <MoneyRow label="Shipping invoiced" amount={order.freightAmount} />}
            <p className="pt-2 text-xs text-ink-muted">
              Goods {order.goodsPaidAt ? `paid ${formatAccraDateTime(order.goodsPaidAt)}` : "not paid"}
              {" · "}
              Shipping{" "}
              {order.freightPaidAt
                ? `paid ${formatAccraDateTime(order.freightPaidAt)}`
                : order.freightInvoicedAt
                  ? "invoiced, not paid"
                  : "not invoiced yet"}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Items" />
        <ul className="divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-4 px-5 py-3 text-sm">
              <span className="text-ink">
                {item.qty}× {item.name}
                {item.variant && <span className="text-ink-muted"> · {item.variant}</span>}
              </span>
              <span className="text-ink-muted" data-numeric>
                {formatGhs(item.unitPrice * item.qty)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <PaymentsCard payments={order.payments} />

      <Card>
        <CardHeader title="Timeline" />
        <CardBody>
          <Timeline order={order} />
        </CardBody>
      </Card>
    </div>
  );
}

function PaymentsCard({ payments }: { payments: AdminOrderDetail["payments"] }) {
  return (
    <Card>
      <CardHeader
        title="Payment attempts"
        description="Every checkout started for this order, newest first. A pending attempt that never resolved is the usual cause of “I paid but it says unpaid”."
      />
      {payments.length === 0 ? (
        <CardBody>
          <p className="text-sm text-ink-muted">No payment was ever started for this order.</p>
        </CardBody>
      ) : (
        <ul className="divide-y divide-border">
          {payments.map((payment) => {
            const meta = PAYMENT_STATUS[payment.status];
            const paystack = summarisePaystackRaw(payment.raw);
            return (
              <li key={payment.id} className="space-y-2 px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-medium text-ink">
                    {PAYMENT_TYPE_LABEL[payment.type]} · {formatGhs(payment.amount)}
                  </span>
                  <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                  <span className="ml-auto">
                    {payment.status === "pending" && <RecheckPaymentButton paymentId={payment.id} />}
                  </span>
                </div>
                <p className="font-mono text-xs break-all text-ink-muted">{payment.reference}</p>
                <p className="text-xs text-ink-muted">
                  Started {formatAccraDateTime(payment.createdAt)}
                  {payment.paidAt && ` · paid ${formatAccraDateTime(payment.paidAt)}`}
                  {paystack.channel && ` · ${paystack.channel.replace("_", " ")}`}
                  {paystack.gatewayResponse && ` · “${paystack.gatewayResponse}”`}
                  {paystack.fees !== null && ` · Paystack fee ${formatGhs(paystack.fees)}`}
                </p>
                {payment.raw !== null && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-ink-muted hover:text-ink">Raw Paystack response</summary>
                    <pre className="mt-2 max-h-80 overflow-auto rounded-control bg-surface-sunken p-3 text-[11px] leading-relaxed text-ink">
                      {JSON.stringify(payment.raw, null, 2)}
                    </pre>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Timeline({ order }: { order: AdminOrderDetail }) {
  const events = [
    { at: order.createdAt, label: "Order created" },
    order.goodsPaidAt && { at: order.goodsPaidAt, label: "Goods paid" },
    order.freightInvoicedAt && {
      at: order.freightInvoicedAt,
      label: `Shipping invoiced${order.freightAmount !== null ? ` (${formatGhs(order.freightAmount)})` : ""}`,
    },
    order.freightPaidAt && { at: order.freightPaidAt, label: "Shipping paid" },
    order.collectedAt && {
      at: order.collectedAt,
      label: order.fulfilment === "delivery" ? "Delivered" : "Picked up",
    },
    order.cancelledAt && { at: order.cancelledAt, label: "Cancelled" },
  ]
    .filter((event): event is { at: string; label: string } => Boolean(event))
    .sort((a, b) => a.at.localeCompare(b.at));

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={`${event.label}-${event.at}`} className="flex gap-3 text-sm">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ink-subtle" aria-hidden />
          <span className="text-ink">{event.label}</span>
          <span className="ml-auto text-ink-muted">{formatAccraDateTime(event.at)}</span>
        </li>
      ))}
      {order.status === "pending_payment" && order.holdExpiresAt && (
        <li className="flex gap-3 text-sm">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-closing" aria-hidden />
          <span className="text-ink">Hold expires if unpaid</span>
          <span className="ml-auto text-ink-muted">{formatAccraDateTime(order.holdExpiresAt)}</span>
        </li>
      )}
    </ol>
  );
}

function Details({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="space-y-2.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-4">
          <dt className="text-ink-muted">{label}</dt>
          <dd className="max-w-[65%] text-right font-medium break-words text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
