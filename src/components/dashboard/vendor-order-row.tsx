"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";

import { MarkReceivedButton } from "@/app/o/[token]/mark-received-button";
import { ButtonLink } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { formatGhsCompact } from "@/lib/money";
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

/** Dense edge-to-edge row — built for long order lists. */
export function VendorOrderRow({ order }: { order: VendorOrderRowData }) {
  const feedbackHref = whatsappChatLink(
    order.phone,
    `Hi! Your order ${order.code} is marked received. Please rate your experience here: ${absoluteUrl(orderPath(order.publicToken))}#feedback`,
  );

  const needsAction =
    order.status === "freight_paid" || order.status === "collected";

  return (
    <li className="border-b border-border last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-2.5 lg:px-8">
        <Link
          href={`/o/${order.publicToken}`}
          className="min-w-0 flex-1 transition-colors hover:text-brand-700"
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="truncate text-sm font-medium text-ink">
              {order.customerName}
            </p>
            <p className="truncate text-xs text-ink-muted" data-numeric>
              {order.code}
            </p>
          </div>
          <p className="truncate text-xs text-ink-subtle">
            {formatLocalPhone(order.phone)} · {order.dropTitle} · B
            {order.batchNumber} · {formatAccraDateTime(order.createdAt)}
          </p>
        </Link>

        <p
          className="shrink-0 text-sm font-semibold text-ink tabular-nums"
          data-numeric
        >
          {formatGhsCompact(order.goodsTotal)}
        </p>
        <StatusPill
          tone={ORDER_STATUS[order.status].tone}
          className="shrink-0 !px-2 !py-0.5 !text-[11px]"
        >
          {orderStatusLabel(order.status, order.fulfilment, "vendor")}
        </StatusPill>
      </div>

      {needsAction && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-surface-muted/40 px-5 py-2 lg:px-8">
          {order.status === "freight_paid" && (
            <MarkReceivedButton
              token={order.publicToken}
              fulfilment={order.fulfilment}
              actor="vendor"
              className="!h-8 !px-3 !text-xs sm:max-w-xs"
            />
          )}
          {order.status === "collected" && (
            <ButtonLink
              href={feedbackHref}
              variant="secondary"
              size="sm"
              target="_blank"
              rel="noopener noreferrer"
              className="!h-8 !px-3 !text-xs"
            >
              <MessageCircle className="size-3.5" aria-hidden />
              Ask for rating
            </ButtonLink>
          )}
        </div>
      )}
    </li>
  );
}
