import "server-only";

import type { OrderStatus } from "@/lib/status";
import { orderStatusLabel, type FulfilmentMethod } from "@/lib/status";
import { createAdminClient } from "@/lib/supabase/admin";

export type OrderShareCard = {
  code: string;
  statusLabel: string;
  status: OrderStatus;
  vendorName: string;
  dropTitle: string;
  batchNumber: number;
};

/**
 * Fields safe to put on a social unfurl for `/o/[token]`.
 * No customer name, phone, address, or totals — the link is capability-based
 * and may be pasted into a group chat.
 */
export async function getOrderShareCard(
  token: string,
): Promise<OrderShareCard | null> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(
      "code, status, fulfilment, batches(number, drops(title, vendors(business_name)))",
    )
    .eq("public_token", token)
    .maybeSingle();

  if (!order?.batches?.drops?.vendors) return null;

  const fulfilment = (order.fulfilment === "delivery" ? "delivery" : "pickup") as FulfilmentMethod;
  const status = order.status as OrderStatus;

  return {
    code: order.code,
    status,
    statusLabel: orderStatusLabel(status, fulfilment, "public"),
    vendorName: order.batches.drops.vendors.business_name,
    dropTitle: order.batches.drops.title,
    batchNumber: order.batches.number,
  };
}
