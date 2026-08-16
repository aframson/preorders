"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";

import { MarkReceivedButton } from "@/app/o/[token]/mark-received-button";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { formatGhs } from "@/lib/money";
import { formatLocalPhone } from "@/lib/phone";
import { absoluteUrl, orderPath, whatsappChatLink } from "@/lib/site";
import {
  ORDER_STATUS,
  orderStatusLabel,
  type OrderStatus,
} from "@/lib/status";
import { formatAccraDateTime } from "@/lib/time";

export type VendorOrderRowData = {
  id: string;
  code: string;
  publicToken: string;
  status: OrderStatus;
  fulfilment: "pickup" | "delivery";
  goodsTotal: number;
  createdAt: string;
  customerName: string;
  phone: string;
  dropTitle: string;
  batchNumber: number;
};

export function VendorOrderRow({ order }: { order: VendorOrderRowData }) {
  const feedbackHref = whatsappChatLink(
    order.phone,
    `Hi! Your order ${order.code} is marked received. Please rate your experience here: ${absoluteUrl(orderPath(order.publicToken))}#feedback`,
  );

  return (
    <li className="rounded-card border border-border bg-surface px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Link
          href={`/o/${order.publicToken}`}
          className="min-w-0 flex-1 transition-colors hover:text-brand-700"
        >
          <p className="font-medium text-ink">{order.customerName}</p>
          <p className="mt-0.5 text-sm text-ink-muted" data-numeric>
            {order.code} · {formatLocalPhone(order.phone)}
          </p>
          <p className="mt-0.5 text-xs text-ink-subtle">
            {order.dropTitle} · Batch {order.batchNumber} ·{" "}
            {formatAccraDateTime(order.createdAt)}
          </p>
        </Link>

        <div className="flex items-center gap-4">
          <p className="font-display font-semibold text-ink" data-numeric>
            {formatGhs(order.goodsTotal)}
          </p>
          <StatusPill tone={ORDER_STATUS[order.status].tone}>
            {orderStatusLabel(order.status, order.fulfilment, "vendor")}
          </StatusPill>
        </div>
      </div>

      {order.status === "freight_paid" && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <MarkReceivedButton
            token={order.publicToken}
            fulfilment={order.fulfilment}
            actor="vendor"
            className="sm:max-w-xs"
          />
        </div>
      )}

      {order.status === "collected" && (
        <div className="mt-4">
          <ButtonLink
            href={feedbackHref}
            variant="secondary"
            size="sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-4" aria-hidden />
            Ask for a rating
          </ButtonLink>
        </div>
      )}
    </li>
  );
}
