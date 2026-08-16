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
 * Refuses to run a second time once any customer has paid their share: those
 * amounts are already in the world and cannot be silently rewritten.
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

  const now = new Date().toISOString();
  const admin = createAdminClient();

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
    message: "Shipping has been calculated. Pay your share to collect your goods.",
  });

  await triggerFreightInvoices(params.batchId);

  const { notifyFreightDue } = await import("@/lib/notify");
  void notifyFreightDue(params.batchId).catch((error) =>
    console.error("[notify] freight due", error),
  );

  return preview;
}

export { SettlementError };
