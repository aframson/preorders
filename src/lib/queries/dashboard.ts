import "server-only";

import type { BatchStatus, OrderStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export type DashboardBatch = {
  id: string;
  dropId: string;
  dropTitle: string;
  dropSlug: string;
  number: number;
  status: BatchStatus;
  opensAt: string;
  closesAt: string;
  freightFinalisedAt: string | null;
  orders: {
    id: string;
    status: OrderStatus;
    goodsTotal: number;
    freightAmount: number | null;
    freightPaidAt: string | null;
  }[];
};

/**
 * Everything the vendor home screen needs in one pass. Orders are pulled in
 * full rather than aggregated in SQL because the action queue needs to count
 * several different states of the same rows.
 */
export async function getDashboardBatches(
  vendorId: string,
): Promise<DashboardBatch[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("drops")
    .select(
      "id, slug, title, batches(id, number, status, opens_at, closes_at, freight_finalised_at, orders(id, status, goods_total, freight_amount, freight_paid_at))",
    )
    .eq("vendor_id", vendorId)
    .is("archived_at", null);

  const batches: DashboardBatch[] = [];

  for (const drop of data ?? []) {
    for (const batch of drop.batches ?? []) {
      batches.push({
        id: batch.id,
        dropId: drop.id,
        dropTitle: drop.title,
        dropSlug: drop.slug,
        number: batch.number,
        status: batch.status,
        opensAt: batch.opens_at,
        closesAt: batch.closes_at,
        freightFinalisedAt: batch.freight_finalised_at,
        orders: (batch.orders ?? []).map((order) => ({
          id: order.id,
          status: order.status,
          goodsTotal: order.goods_total,
          freightAmount: order.freight_amount,
          freightPaidAt: order.freight_paid_at,
        })),
      });
    }
  }

  return batches.sort((a, b) => b.number - a.number);
}

/** Orders that count toward totals: paid for, and not cancelled. */
export function isCounted(status: OrderStatus): boolean {
  return status !== "pending_payment" && status !== "cancelled";
}

export function batchTotals(batch: DashboardBatch) {
  const counted = batch.orders.filter((order) => isCounted(order.status));
  return {
    orderCount: counted.length,
    value: counted.reduce((sum, order) => sum + order.goodsTotal, 0),
    awaitingPayment: batch.orders.filter(
      (order) => order.status === "pending_payment",
    ).length,
    awaitingFreight: counted.filter(
      (order) => order.status === "awaiting_freight" && !order.freightPaidAt,
    ).length,
  };
}
