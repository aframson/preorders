import "server-only";

import { freightUnits, type FreightMode } from "@/lib/freight";
import type { Pesewas } from "@/lib/money";
import type { BatchStatus, OrderStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export type BatchOrderItem = {
  id: string;
  productId: string | null;
  /** Chosen option ids (one per group, e.g. Size + Colour). */
  variantIds: string[];
  qty: number;
  unitPrice: Pesewas;
  weightGrams: number;
  volumeCm3: number;
  snapshot: {
    productName?: string;
    variantName?: string;
    variantValue?: string;
    imagePath?: string;
  };
};

export type BatchOrder = {
  id: string;
  code: string;
  status: OrderStatus;
  goodsTotal: Pesewas;
  goodsPaidAt: string | null;
  freightUnits: number;
  freightEstimate: Pesewas;
  freightAmount: Pesewas | null;
  freightInvoicedAt: string | null;
  freightPaidAt: string | null;
  fulfilment: "pickup" | "delivery";
  createdAt: string;
  publicToken: string;
  customer: { id: string; name: string; phone: string; email: string | null };
  items: BatchOrderItem[];
};

export type BatchDetail = {
  id: string;
  dropId: string;
  dropTitle: string;
  dropSlug: string;
  vendorSlug: string;
  number: number;
  status: BatchStatus;
  opensAt: string;
  closesAt: string;
  closedAt: string | null;
  expectedDeliveryAt: string | null;
  autoOpenNext: boolean;
  freightMode: FreightMode;
  freightRateEstimate: Pesewas;
  freightTotalActual: Pesewas | null;
  freightUnitsTotal: number | null;
  freightFinalisedAt: string | null;
  orders: BatchOrder[];
};

const BATCH_SELECT =
  "id, number, status, opens_at, closes_at, closed_at, expected_delivery_at, auto_open_next, freight_mode, freight_rate_estimate, freight_total_actual, freight_units_total, freight_finalised_at, drops(id, slug, title, vendors(slug)), orders(id, code, public_token, status, goods_total, goods_paid_at, freight_units, freight_estimate, freight_amount, freight_invoiced_at, freight_paid_at, fulfilment, created_at, customers(id, name, phone, email), order_items(id, product_id, variant_ids, qty, unit_price, weight_grams, volume_cm3, snapshot))";

export async function getBatchDetail(
  batchId: string,
): Promise<BatchDetail | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("batches")
    .select(BATCH_SELECT)
    .eq("id", batchId)
    .maybeSingle();

  if (!data?.drops) return null;

  return {
    id: data.id,
    dropId: data.drops.id,
    dropTitle: data.drops.title,
    dropSlug: data.drops.slug,
    vendorSlug: data.drops.vendors?.slug ?? "",
    number: data.number,
    status: data.status,
    opensAt: data.opens_at,
    closesAt: data.closes_at,
    closedAt: data.closed_at,
    expectedDeliveryAt: data.expected_delivery_at,
    autoOpenNext: data.auto_open_next,
    freightMode: data.freight_mode,
    freightRateEstimate: data.freight_rate_estimate,
    freightTotalActual: data.freight_total_actual,
    freightUnitsTotal: data.freight_units_total,
    freightFinalisedAt: data.freight_finalised_at,
    orders: (data.orders ?? [])
      .map((order) => ({
        id: order.id,
        code: order.code,
        status: order.status,
        goodsTotal: order.goods_total,
        goodsPaidAt: order.goods_paid_at,
        freightUnits: Number(order.freight_units),
        freightEstimate: order.freight_estimate,
        freightAmount: order.freight_amount,
        freightInvoicedAt: order.freight_invoiced_at,
        freightPaidAt: order.freight_paid_at,
        fulfilment: order.fulfilment,
        createdAt: order.created_at,
        publicToken: order.public_token,
        customer: {
          id: order.customers?.id ?? "",
          name: order.customers?.name ?? "Unknown",
          phone: order.customers?.phone ?? "",
          email: order.customers?.email ?? null,
        },
        items: (order.order_items ?? []).map((item) => ({
          id: item.id,
          productId: item.product_id,
          variantIds: item.variant_ids ?? [],
          qty: item.qty,
          unitPrice: item.unit_price,
          weightGrams: item.weight_grams,
          volumeCm3: item.volume_cm3,
          snapshot: (item.snapshot ?? {}) as BatchOrderItem["snapshot"],
        })),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

/**
 * Orders that are actually on the boat, and so are the ones freight is split
 * across. An order that never got paid for was never bought, and a cancelled
 * one is not shipping, so neither can be asked to carry a share.
 */
export function shippingOrders(batch: BatchDetail): BatchOrder[] {
  return batch.orders.filter(
    (order) => order.status !== "pending_payment" && order.status !== "cancelled",
  );
}

export function batchStats(batch: BatchDetail) {
  const shipping = shippingOrders(batch);

  const units = shipping.reduce(
    (sum, order) =>
      sum +
      (order.freightUnits ||
        freightUnits(
          batch.freightMode,
          order.items.map((item) => ({
            qty: item.qty,
            weightGrams: item.weightGrams,
            volumeCm3: item.volumeCm3,
          })),
        )),
    0,
  );

  return {
    orderCount: shipping.length,
    unitCount: shipping.reduce(
      (sum, order) =>
        sum + order.items.reduce((itemSum, item) => itemSum + item.qty, 0),
      0,
    ),
    value: shipping.reduce((sum, order) => sum + order.goodsTotal, 0),
    freightUnitsTotal: units,
    awaitingPayment: batch.orders.filter(
      (order) => order.status === "pending_payment",
    ).length,
    awaitingFreight: shipping.filter(
      (order) => order.freightInvoicedAt && !order.freightPaidAt,
    ).length,
  };
}
