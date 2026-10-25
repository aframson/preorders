"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { resetVendorPayout } from "@/app/admin/vendors/[vendorId]/actions";
import { requireAdmin } from "@/lib/admin-auth";
import { finaliseBatchClose, openScheduledBatch } from "@/lib/batches";
import { releaseUnpaidHold } from "@/lib/holds";
import { formatGhs } from "@/lib/money";
import { reconcilePayment } from "@/lib/payments";
import {
  isPaystackConfigured,
  PaystackError,
  verifyTransaction,
} from "@/lib/paystack";
import { summarisePaystackRaw } from "@/lib/paystack-raw";
import type { HealthFixKind } from "@/lib/queries/admin-health";
import { settleBatchIfFreightComplete } from "@/lib/settlement.server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminActionResult = { error?: string; message?: string };

function refreshAdmin() {
  revalidatePath("/admin", "layout");
}

/**
 * Asks Paystack directly what happened to a payment, for "I paid but it says
 * unpaid". Only a confirmed success changes anything, and it goes through
 * `reconcilePayment` — the exact path the webhook uses. Any other answer is
 * reported but left alone: marking our row failed would make a late success
 * from Paystack impossible to apply.
 */
export async function recheckPayment(paymentId: string): Promise<AdminActionResult> {
  await requireAdmin();
  const parsed = z.uuid().safeParse(paymentId);
  if (!parsed.success) return { error: "Invalid payment." };
  if (!isPaystackConfigured()) {
    return { error: "Paystack isn't configured on this server." };
  }

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("provider_ref, amount")
    .eq("id", parsed.data)
    .maybeSingle();

  if (!payment) return { error: "Payment not found." };

  let transaction: Awaited<ReturnType<typeof verifyTransaction>>;
  try {
    transaction = await verifyTransaction(payment.provider_ref);
  } catch (error) {
    if (error instanceof PaystackError) {
      return {
        error: `Paystack: ${error.message}. If the reference isn't found, the customer never reached the payment page, or it was made in the other Paystack mode (test vs live).`,
      };
    }
    console.error("[admin] Paystack verify failed", error);
    return { error: "Could not reach Paystack. Try again." };
  }

  const { gatewayResponse } = summarisePaystackRaw(transaction.raw);
  const said = `Paystack says "${transaction.status}"${gatewayResponse ? ` (${gatewayResponse})` : ""}`;

  if (transaction.status !== "success") {
    return {
      message: `${said}. Nothing changed: the payment stays pending so it still applies if the customer completes it.`,
    };
  }

  const result = await reconcilePayment({
    reference: transaction.reference,
    amount: transaction.amount,
    paidAt: transaction.paidAt,
    raw: transaction.raw,
  });
  refreshAdmin();

  switch (result.outcome) {
    case "applied":
      return {
        message: `${said}. Payment applied: the order is updated and the customer was emailed.`,
      };
    case "already_applied":
      return { message: `${said}. It was already applied, so nothing changed.` };
    case "amount_mismatch":
      return {
        error: `Paystack charged ${formatGhs(transaction.amount)} but this payment expected ${formatGhs(payment.amount)}. It was marked failed. Check it in the Paystack dashboard before releasing goods.`,
      };
    case "unknown_reference":
      return { error: "Paystack confirmed the charge, but no payment here matches its reference." };
  }
}

const fixSchema = z.object({
  kind: z.enum([
    "recheck_payment",
    "waive_zero_freight",
    "settle_batch",
    "close_batch",
    "open_batch",
    "release_hold",
    "reset_payout",
  ] satisfies HealthFixKind[]),
  targetId: z.uuid(),
});

const STALE = "This no longer needs fixing. Refresh the page.";

/**
 * Runs the fix behind a health check. Every branch re-checks the problem
 * still exists before acting, because the page may be minutes old — a vendor
 * could have extended the cutoff, or the customer paid, in the meantime.
 */
export async function runHealthFix(
  kind: HealthFixKind,
  targetId: string,
): Promise<AdminActionResult> {
  await requireAdmin();
  const parsed = fixSchema.safeParse({ kind, targetId });
  if (!parsed.success) return { error: "Invalid fix." };

  const id = parsed.data.targetId;
  const admin = createAdminClient();

  switch (parsed.data.kind) {
    case "recheck_payment":
      return recheckPayment(id);

    case "waive_zero_freight": {
      const { data: order } = await admin
        .from("orders")
        .update({ status: "freight_paid" })
        .eq("id", id)
        .eq("status", "awaiting_freight")
        .eq("freight_amount", 0)
        .select("batch_id")
        .maybeSingle();

      if (!order) return { error: STALE };

      await settleBatchIfFreightComplete(order.batch_id).catch((error) =>
        console.error("[admin] settle after waive", error),
      );
      const { notifyFreightWaived } = await import("@/lib/notify");
      void notifyFreightWaived(id).catch((error) =>
        console.error("[admin] notify freight waived", error),
      );
      refreshAdmin();
      return { message: "Shipping marked settled. The customer was emailed." };
    }

    case "settle_batch": {
      const result = await settleBatchIfFreightComplete(id);
      refreshAdmin();
      if (result === "not_ready") {
        return { error: "Someone in this batch still owes shipping. Refresh the page." };
      }
      return {
        message: result === "settled" ? "Batch marked completed." : "Batch was already completed.",
      };
    }

    case "close_batch": {
      const { data: batch } = await admin
        .from("batches")
        .select("status, closes_at")
        .eq("id", id)
        .maybeSingle();

      if (
        !batch ||
        batch.status !== "open" ||
        new Date(batch.closes_at).getTime() > Date.now()
      ) {
        return { error: "This batch is no longer open past its cutoff. The vendor may have extended it. Refresh the page." };
      }

      const result = await finaliseBatchClose(id);
      refreshAdmin();
      return {
        message: result.openedBatchId
          ? "Batch closed, and the next batch opened automatically."
          : "Batch closed.",
      };
    }

    case "open_batch": {
      const result = await openScheduledBatch(id);
      refreshAdmin();
      if (result.opened) return { message: "Batch opened." };
      return {
        error:
          result.reason === "vendor_not_approved"
            ? "Couldn't open: the vendor's payout isn't approved."
            : result.reason === "already_open"
              ? "Couldn't open: another batch on this link is already open."
              : result.reason === "blocked"
                ? "Couldn't open: a product is probably missing its shipping size. The vendor has been told in their timeline."
                : STALE,
      };
    }

    case "reset_payout": {
      const result = await resetVendorPayout(id);
      refreshAdmin();
      return { error: result.error ?? undefined, message: result.message ?? undefined };
    }

    case "release_hold": {
      const { data: order } = await admin
        .from("orders")
        .select("status, hold_expires_at")
        .eq("id", id)
        .maybeSingle();

      if (
        !order ||
        order.status !== "pending_payment" ||
        !order.hold_expires_at ||
        new Date(order.hold_expires_at).getTime() > Date.now()
      ) {
        return { error: STALE };
      }

      const { released } = await releaseUnpaidHold(id);
      refreshAdmin();
      return released ? { message: "Order released." } : { error: STALE };
    }
  }
}
