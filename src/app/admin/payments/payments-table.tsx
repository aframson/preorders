"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DownloadCsvButton } from "@/components/admin/download-csv-button";
import { RecheckPaymentButton } from "@/components/admin/fix-buttons";
import { ListSearch } from "@/components/ui/list-search";
import { StatusPill } from "@/components/ui/status-pill";
import { formatGhs } from "@/lib/money";
import { PAYMENT_STATUS, PAYMENT_TYPE_LABEL } from "@/lib/payment-status";
import type { AdminPaymentRow } from "@/lib/queries/admin-payments";
import { matchesQuery } from "@/lib/search";
import { formatAccraDateTime } from "@/lib/time";

export function PaymentsTable({ payments }: { payments: AdminPaymentRow[] }) {
  const [query, setQuery] = useState("");

  const visible = useMemo(
    () =>
      payments.filter((payment) =>
        matchesQuery(
          [
            payment.reference,
            payment.order.code,
            payment.customer.name,
            payment.customer.phone,
            payment.vendor.name,
            payment.dropTitle,
          ],
          query,
        ),
      ),
    [payments, query],
  );

  const total = visible
    .filter((payment) => payment.status === "success")
    .reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <ListSearch
          value={query}
          onChange={setQuery}
          placeholder="Search reference, order code, customer or shop"
          label="Search payments"
          className="min-w-64 flex-1"
        />
        <DownloadCsvButton
          filename="payments.csv"
          rows={[
            ["created_at", "paid_at", "reference", "type", "status", "amount_ghs", "order", "customer", "vendor", "drop", "batch"],
            ...visible.map((payment) => [
              payment.createdAt,
              payment.paidAt,
              payment.reference,
              payment.type,
              payment.status,
              (payment.amount / 100).toFixed(2),
              payment.order.code,
              payment.customer.name,
              payment.vendor.name,
              payment.dropTitle,
              payment.batchNumber,
            ]),
          ]}
        />
      </div>

      <p className="text-xs text-ink-muted">
        {visible.length} payment{visible.length === 1 ? "" : "s"} · {formatGhs(total)} paid
      </p>

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b border-border bg-surface-muted text-xs text-ink-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">When</th>
              <th className="px-4 py-2.5 font-medium">Order</th>
              <th className="px-4 py-2.5 font-medium">Shop</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Paystack reference</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {visible.map((payment) => (
              <tr key={payment.id} className="border-b border-border align-top last:border-0">
                <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                  {formatAccraDateTime(payment.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${payment.order.id}`} className="font-medium text-ink hover:underline" data-numeric>
                    {payment.order.code}
                  </Link>
                  <p className="text-xs text-ink-muted">{payment.customer.name}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-ink">{payment.vendor.name}</p>
                  <p className="text-xs text-ink-muted">
                    {payment.dropTitle} · Batch {payment.batchNumber}
                  </p>
                </td>
                <td className="px-4 py-3 text-ink-muted">{PAYMENT_TYPE_LABEL[payment.type]}</td>
                <td className="px-4 py-3 text-right font-medium text-ink" data-numeric>
                  {formatGhs(payment.amount)}
                </td>
                <td className="px-4 py-3">
                  <StatusPill tone={PAYMENT_STATUS[payment.status].tone}>
                    {PAYMENT_STATUS[payment.status].label}
                  </StatusPill>
                </td>
                <td className="max-w-48 px-4 py-3 font-mono text-xs break-all text-ink-muted">
                  {payment.reference}
                </td>
                <td className="px-4 py-3 text-right">
                  {payment.status === "pending" && <RecheckPaymentButton paymentId={payment.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-ink-muted">No payments match.</p>
        )}
      </div>
    </div>
  );
}
