import "server-only";

import { triggerFreightInvoices } from "@/lib/jobs";
import { getBatchDetail, shippingOrders, type BatchDetail } from "@/lib/queries/batch";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isFreightSettled,
  previewFreight,
  previewIndividualFreight,
  SettlementError,
  type FreightPreview,
} from "@/lib/settlement";
import type { Pesewas } from "@/lib/money";

/** Shared setup for both ways of finalising freight: load the batch, refuse once real money has moved. */
async function loadFinalisableBatch(batchId: string): Promise<BatchDetail> {
  const batch = await getBatchDetail(batchId);
  if (!batch) throw new SettlementError("Batch not found.");

  // A settled batch is a completed, closed-out state — even though the
  // zero-share auto-waive path never sets freightPaidAt (see below), nothing
  // should be able to re-invoice it after the fact.
  if (batch.status === "settled") {
    throw new SettlementError(
      "This batch is already settled. Shipping can't be changed anymore.",
    );
  }

  // "Paid" here means either a real Paystack payment (freightPaidAt) or an
  // order the customer has already collected — a zero-share order reaches
  // "collected" via the auto-waive path below without ever getting
  // freightPaidAt set, and it must be just as untouchable once goods are
  // actually in the customer's hands, even if other orders in the same
  // batch are still awaiting a genuine payment.
  const alreadyPaid = shippingOrders(batch).some(
    (order) => Boolean(order.freightPaidAt) || order.status === "collected",
  );
  if (alreadyPaid) {
    throw new SettlementError(
      "Some customers have already paid shipping. The split cannot be changed.",
    );
  }

  return batch;
}

/**
 * Writes an already-computed allocation (from either `previewFreight` or
 * `previewIndividualFreight` — same shape either way), flips every shipping
 * order to `awaiting_freight`, and marks the batch as invoiced. Always
 * recomputes from scratch so a correction never leaves leftover pesewas on
 * the table.
 */
async function applyFreightPreview(
  batchId: string,
  preview: FreightPreview,
): Promise<FreightPreview> {
  if (preview.shipping.length === 0) {
    throw new SettlementError("There are no paid orders to split shipping across.");
  }

  const revising = preview.alreadyFinalised;
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
      freight_total_actual: preview.charge,
      freight_units_total: preview.unitsTotal,
      freight_finalised_at: now,
      status: "freight_invoiced",
    })
    .eq("id", batchId);

  if (batchError) throw new SettlementError(batchError.message);

  const waivedOrderIds: string[] = [];

  for (const row of preview.rows) {
    // A share that comes out to nothing — whether the weight/volume split
    // rounded down, or the vendor typed "0" directly for this customer — is
    // not an error. There is no way to "pay" a zero-pesewas charge through
    // Paystack (the checkout flow refuses to even start one), so leaving the
    // order in `awaiting_freight` would strand it there forever with no path
    // forward and no way for the batch to ever reach "settled". Settle it
    // immediately instead: there is genuinely nothing to collect.
    // `freight_paid_at` is deliberately left untouched (not backdated) so a
    // later correction that makes this order's share non-zero still counts
    // as unpaid, and so revising the bill isn't blocked by a payment that
    // never actually happened.
    const owesNothing = row.amount === 0;
    if (owesNothing) waivedOrderIds.push(row.orderId);

    const { error } = await admin
      .from("orders")
      .update({
        freight_units: row.units,
        freight_amount: row.amount,
        freight_invoiced_at: now,
        status: owesNothing ? "freight_paid" : "awaiting_freight",
      })
      .eq("id", row.orderId)
      .neq("status", "cancelled")
      // Belt-and-suspenders against the loadFinalisableBatch guard above: an
      // order a customer already collected must never be regressed back to
      // "awaiting_freight", even if one raced to "collected" in the gap
      // between that check and this write.
      .neq("status", "collected");

    if (error) throw new SettlementError(error.message);
  }

  await admin.from("batch_events").insert({
    batch_id: batchId,
    type: "freight_invoiced",
    message: revising
      ? "Shipping amount was updated. Pay the new share to collect your goods."
      : "Shipping has been calculated. Pay your share to collect your goods.",
    is_public: true,
  });

  await triggerFreightInvoices(batchId);

  const { notifyFreightDue, notifyFreightWaived } = await import("@/lib/notify");
  void notifyFreightDue(batchId).catch((error) =>
    console.error("[notify] freight due", error),
  );
  for (const orderId of waivedOrderIds) {
    void notifyFreightWaived(orderId).catch((error) =>
      console.error("[notify] freight waived", error),
    );
  }

  // The rare case where every order's share rounded to nothing (or the
  // vendor hand-waived everyone) settles the whole batch on this very
  // invoicing run — nothing left for anyone to pay.
  if (waivedOrderIds.length > 0) {
    await settleBatchIfFreightComplete(batchId).catch((error) =>
      console.error("[settle] batch after waived freight", error),
    );
  }

  return preview;
}

/** Splits one total across every shipping order by weight or volume. */
export async function finaliseFreight(params: {
  batchId: string;
  charge: Pesewas;
  cost: Pesewas | null;
}): Promise<FreightPreview> {
  const batch = await loadFinalisableBatch(params.batchId);

  if (params.charge <= 0) {
    throw new SettlementError("Enter the amount you are charging.");
  }

  const preview = previewFreight(batch, params.charge, params.cost);
  return applyFreightPreview(params.batchId, preview);
}

/**
 * The hand-priced alternative: the vendor sets each shipping order's amount
 * directly rather than splitting one total by weight or volume — for when a
 * forwarder bills per item or per shipment and no proportional formula
 * matches that.
 *
 * Every current shipping order must have an explicit entry in `amounts`
 * (0 is fine — that's how a vendor waives someone's share on purpose). A row
 * silently missing from the submitted form is refused rather than treated
 * as an unintentional free pass.
 */
export async function finaliseIndividualFreight(params: {
  batchId: string;
  amounts: Readonly<Record<string, Pesewas>>;
  cost: Pesewas | null;
}): Promise<FreightPreview> {
  const batch = await loadFinalisableBatch(params.batchId);

  const missing = shippingOrders(batch).filter(
    (order) => !(order.id in params.amounts),
  );
  if (missing.length > 0) {
    throw new SettlementError(
      `Enter an amount for every customer — missing ${missing.length} of them.`,
    );
  }

  const preview = previewIndividualFreight(batch, params.amounts, params.cost);
  return applyFreightPreview(params.batchId, preview);
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

  const allFreightPaid = shipping.every((order) =>
    isFreightSettled({ status: order.status, freightPaidAt: order.freight_paid_at }),
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
