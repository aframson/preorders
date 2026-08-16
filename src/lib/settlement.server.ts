import "server-only";

import { triggerFreightInvoices } from "@/lib/jobs";
import { getBatchDetail, shippingOrders } from "@/lib/queries/batch";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  previewFreight,
  SettlementError,
  type FreightPreview,
} from "@/lib/settlement";
import type { Pesewas } from "@/lib/money";

/**
 * Writes the allocation, flips every shipping order to `awaiting_freight`,
 * and marks the batch as invoiced. Always recomputes from scratch so a
 * correction never leaves leftover pesewas on the table.
 *
 * Safe to run again while invoices are unpaid (vendor corrected the bill).
 * Refuses once any customer has paid their share: those amounts are already
 * in the world and cannot be silently rewritten.
 */
export async function finaliseFreight(params: {
  batchId: string;
  charge: Pesewas;
  cost: Pesewas | null;
}): Promise<FreightPreview> {
  const batch = await getBatchDetail(params.batchId);
  if (!batch) throw new SettlementError("Batch not found.");

  if (params.charge <= 0) {
    throw new SettlementError("Enter the amount you are charging.");
  }

  const alreadyPaid = shippingOrders(batch).some((order) => order.freightPaidAt);
  if (alreadyPaid) {
    throw new SettlementError(
      "Some customers have already paid shipping. The split cannot be changed.",
    );
  }

  const preview = previewFreight(batch, params.charge, params.cost);
  if (preview.shipping.length === 0) {
    throw new SettlementError("There are no paid orders to split shipping across.");
  }

  const revising = Boolean(batch.freightFinalisedAt);
  const now = new Date().toISOString();
  const admin = createAdminClient();

  // Old Paystack freight checkouts must not settle against a revised amount.
  if (revising) {
    const orderIds = preview.rows.map((row) => row.orderId);
    await admin
      .from("payments")
      .update({ status: "failed" })
      .eq("type", "freight")
      .eq("status", "pending")
      .in("order_id", orderIds);
  }

  const { error: batchError } = await admin
    .from("batches")
    .update({
      freight_total_actual: params.charge,
      freight_units_total: preview.unitsTotal,
      freight_finalised_at: now,
      status: "freight_invoiced",
    })
    .eq("id", params.batchId);

  if (batchError) throw new SettlementError(batchError.message);

  for (const row of preview.rows) {
    const { error } = await admin
      .from("orders")
      .update({
        freight_units: row.units,
        freight_amount: row.amount,
        freight_invoiced_at: now,
        status: "awaiting_freight",
      })
      .eq("id", row.orderId)
      .neq("status", "cancelled");

    if (error) throw new SettlementError(error.message);
  }

  await admin.from("batch_events").insert({
    batch_id: params.batchId,
    type: "freight_invoiced",
    message: revising
      ? "Shipping amount was updated. Pay the new share to collect your goods."
      : "Shipping has been calculated. Pay your share to collect your goods.",
    is_public: true,
  });

  await triggerFreightInvoices(params.batchId);

  const { notifyFreightDue } = await import("@/lib/notify");
  void notifyFreightDue(params.batchId).catch((error) =>
    console.error("[notify] freight due", error),
  );

  return preview;
}

/**
 * Once every shipping order has paid freight, the batch is no longer
 * "invoiced" — advance it to settled so the vendor status matches reality.
 * Idempotent; safe to call after each freight payment or on batch view.
 */
export async function settleBatchIfFreightComplete(
  batchId: string,
): Promise<"settled" | "already_settled" | "not_ready"> {
  const admin = createAdminClient();

  const { data: batch } = await admin
    .from("batches")
    .select("id, status, freight_finalised_at")
    .eq("id", batchId)
    .maybeSingle();

  if (!batch) return "not_ready";
  if (batch.status === "settled") return "already_settled";

  // Invoicing writes freight_invoiced; older/partial rows may still sit on
  // arrived with a finalised bill. Both are eligible to complete.
  const eligible =
    batch.status === "freight_invoiced" ||
    (batch.status === "arrived" && Boolean(batch.freight_finalised_at));
  if (!eligible) return "not_ready";

  const { data: orders } = await admin
    .from("orders")
    .select("id, status, freight_paid_at, freight_invoiced_at")
    .eq("batch_id", batchId)
    .neq("status", "cancelled")
    .neq("status", "pending_payment");

  const shipping = orders ?? [];
  if (shipping.length === 0) return "not_ready";

  const allFreightPaid = shipping.every(
    (order) =>
      Boolean(order.freight_paid_at) ||
      order.status === "freight_paid" ||
      order.status === "collected",
  );

  if (!allFreightPaid) return "not_ready";

  const { data: updated } = await admin
    .from("batches")
    .update({ status: "settled" })
    .eq("id", batchId)
    .in("status", ["freight_invoiced", "arrived"])
    .select("id")
    .maybeSingle();

  if (!updated) {
    // Lost a race to another settle — treat as done if we landed on settled.
    const { data: again } = await admin
      .from("batches")
      .select("status")
      .eq("id", batchId)
      .maybeSingle();
    return again?.status === "settled" ? "already_settled" : "not_ready";
  }

  await admin.from("batch_events").insert({
    batch_id: batchId,
    type: "settled",
    message: "All shipping fees are paid. This batch is complete.",
    is_public: true,
  });

  return "settled";
}

export { SettlementError };
