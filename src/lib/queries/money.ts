import "server-only";

import { PLATFORM_FEE_PERCENT } from "@/lib/fees";
import type { Pesewas } from "@/lib/money";
import { percentOf } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export type TransactionDirection = "inbound" | "outbound";

export type VendorTransaction = {
  id: string;
  direction: TransactionDirection;
  /** Goods payment, freight payment, or platform fee on goods. */
  kind: "goods" | "freight" | "platform_fee";
  amount: Pesewas;
  paidAt: string;
  orderId: string;
  orderCode: string;
  publicToken: string;
  customerName: string;
  dropTitle: string;
  batchNumber: number;
};

export type VendorMoneySummary = {
  /** Successful customer payments (goods + freight). */
  inbound: Pesewas;
  /** Platform cut on goods (never on freight). */
  outbound: Pesewas;
  /** What settles to the vendor: inbound − outbound. */
  net: Pesewas;
  goodsInbound: Pesewas;
  freightInbound: Pesewas;
  transactions: VendorTransaction[];
};

/**
 * Ledger of every successful payment across the vendor's orders, plus a
 * matching outbound platform-fee line for each goods payment.
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

  const transactions: VendorTransaction[] = [];

  for (const drop of drops ?? []) {
    for (const batch of drop.batches ?? []) {
      for (const order of batch.orders ?? []) {
        const customerName = order.customers?.name ?? "Unknown";

        for (const payment of order.payments ?? []) {
          if (payment.status !== "success" || !payment.paid_at) continue;

          const kind = payment.type === "freight" ? "freight" : "goods";
          transactions.push({
            id: payment.id,
            direction: "inbound",
            kind,
            amount: payment.amount,
            paidAt: payment.paid_at,
            orderId: order.id,
            orderCode: order.code,
            publicToken: order.public_token,
            customerName,
            dropTitle: drop.title,
            batchNumber: batch.number,
          });

          if (kind === "goods" && PLATFORM_FEE_PERCENT.goods > 0) {
            const fee = percentOf(payment.amount, PLATFORM_FEE_PERCENT.goods);
            if (fee > 0) {
              transactions.push({
                id: `${payment.id}-fee`,
                direction: "outbound",
                kind: "platform_fee",
                amount: fee,
                paidAt: payment.paid_at,
                orderId: order.id,
                orderCode: order.code,
                publicToken: order.public_token,
                customerName,
                dropTitle: drop.title,
                batchNumber: batch.number,
              });
            }
          }
        }
      }
    }
  }

  transactions.sort((a, b) => b.paidAt.localeCompare(a.paidAt));

  const goodsInbound = transactions
    .filter((row) => row.direction === "inbound" && row.kind === "goods")
    .reduce((sum, row) => sum + row.amount, 0);
  const freightInbound = transactions
    .filter((row) => row.direction === "inbound" && row.kind === "freight")
    .reduce((sum, row) => sum + row.amount, 0);
  const inbound = goodsInbound + freightInbound;
  const outbound = transactions
    .filter((row) => row.direction === "outbound")
    .reduce((sum, row) => sum + row.amount, 0);

  return {
    inbound,
    outbound,
    net: inbound - outbound,
    goodsInbound,
    freightInbound,
    transactions,
  };
}
