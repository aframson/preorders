import "server-only";

import { PLATFORM_FEE_PERCENT } from "@/lib/fees";
import type { Pesewas } from "@/lib/money";
import { percentOf } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export type VendorSettlement = {
  id: string;
  paidAt: string;
  orderId: string;
  orderCode: string;
  publicToken: string;
  customerName: string;
  dropTitle: string;
  batchNumber: number;
  /** goods = split fee; freight = 100% to vendor. */
  kind: "goods" | "freight";
  /** What the customer was charged. */
  customerPaid: Pesewas;
  /** Platform cut (0 for shipping). */
  platformFee: Pesewas;
  /** What Paystack should settle to the vendor. */
  yourShare: Pesewas;
};

export type VendorMoneySummary = {
  inbound: Pesewas;
  outbound: Pesewas;
  net: Pesewas;
  goodsInbound: Pesewas;
  freightInbound: Pesewas;
  settlements: VendorSettlement[];
};

/**
 * One row per successful payment, with an explicit “your share” so vendors
 * are not left guessing between inbound totals and platform fee lines.
 */
export async function getVendorMoney(
  vendorId: string,
): Promise<VendorMoneySummary> {
  const supabase = await createClient();

  const { data: drops } = await supabase
    .from("drops")
    .select(
      "id, title, batches(id, number, orders(id, code, public_token, goods_total, customers(name), payments(id, type, status, amount, paid_at)))",
    )
    .eq("vendor_id", vendorId)
    .is("archived_at", null);

  const settlements: VendorSettlement[] = [];

  for (const drop of drops ?? []) {
    for (const batch of drop.batches ?? []) {
      for (const order of batch.orders ?? []) {
        const customerName = order.customers?.name ?? "Unknown";

        for (const payment of order.payments ?? []) {
          if (payment.status !== "success" || !payment.paid_at) continue;

          const kind = payment.type === "freight" ? "freight" : "goods";
          const customerPaid = payment.amount;
          const platformFee =
            kind === "goods" && PLATFORM_FEE_PERCENT.goods > 0
              ? percentOf(customerPaid, PLATFORM_FEE_PERCENT.goods)
              : 0;

          settlements.push({
            id: payment.id,
            paidAt: payment.paid_at,
            orderId: order.id,
            orderCode: order.code,
            publicToken: order.public_token,
            customerName,
            dropTitle: drop.title,
            batchNumber: batch.number,
            kind,
            customerPaid,
            platformFee,
            yourShare: customerPaid - platformFee,
          });
        }
      }
    }
  }

  settlements.sort((a, b) => b.paidAt.localeCompare(a.paidAt));

  const goodsInbound = settlements
    .filter((row) => row.kind === "goods")
    .reduce((sum, row) => sum + row.customerPaid, 0);
  const freightInbound = settlements
    .filter((row) => row.kind === "freight")
    .reduce((sum, row) => sum + row.customerPaid, 0);
  const inbound = goodsInbound + freightInbound;
  const outbound = settlements.reduce((sum, row) => sum + row.platformFee, 0);

  return {
    inbound,
    outbound,
    net: inbound - outbound,
    goodsInbound,
    freightInbound,
    settlements,
  };
}
