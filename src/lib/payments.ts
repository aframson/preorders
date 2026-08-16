import "server-only";

import { PLATFORM_FEE_PERCENT } from "@/lib/fees";
import { percentOf } from "@/lib/money";
import {
  initialiseTransaction,
  isPaystackConfigured,
  PaystackError,
  PaystackNotConfiguredError,
  paystackMode,
  verifyTransaction,
} from "@/lib/paystack";
import { absoluteUrl, orderPath } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * References are the idempotency key shared with Paystack, so they must be
 * unique per attempt. A customer who abandons the first checkout and comes
 * back gets a second reference against the same order.
 */
function reference(stage: "goods" | "freight", orderId: string): string {
  return `${stage}_${orderId.replace(/-/g, "").slice(0, 16)}_${Date.now().toString(36)}`;
}

export class PaymentUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentUnavailableError";
  }
}

type PaymentTarget = {
  orderId: string;
  code: string;
  publicToken: string;
  email: string;
  amount: number;
  subaccount: string | null;
};

/**
 * Starts a Paystack redirect checkout.
 *
 * Returns `null` only when Paystack keys are not configured (local/dev). When
 * keys are present, failures throw so checkout can surface a real error
 * instead of silently skipping payment.
 */
async function start(
  stage: "goods" | "freight",
  target: PaymentTarget,
): Promise<string | null> {
  if (!isPaystackConfigured()) return null;
  if (target.amount <= 0) {
    throw new PaymentUnavailableError("Nothing to charge for this order.");
  }

  if (paystackMode() === "live" && !target.subaccount) {
    throw new PaymentUnavailableError(
      "This seller has not connected payouts yet. Payment cannot start.",
    );
  }

  const admin = createAdminClient();
  const ref = reference(stage, target.orderId);

  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      order_id: target.orderId,
      type: stage,
      provider: "paystack",
      provider_ref: ref,
      amount: target.amount,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !payment) {
    throw new PaymentUnavailableError(
      "Could not start payment. Please try again.",
    );
  }

  try {
    const transaction = await initialiseTransaction({
      email: target.email,
      amount: target.amount,
      reference: ref,
      callbackUrl: absoluteUrl(orderPath(target.publicToken)),
      subaccount: target.subaccount,
      // The subaccount is created with the goods percentage. Freight is a
      // pass-through, so it has to override that split or we take a cut of
      // money that was never the vendor's.
      platformCharge:
        stage === "freight"
          ? percentOf(target.amount, PLATFORM_FEE_PERCENT.freight)
          : undefined,
      metadata: {
        orderId: target.orderId,
        orderCode: target.code,
        stage,
        paystackMode: paystackMode(),
      },
    });

    return transaction.authorizationUrl;
  } catch (error) {
    // Leaving a dangling pending payment would block reconciliation later.
    await admin.from("payments").delete().eq("id", payment.id);

    if (
      error instanceof PaystackNotConfiguredError ||
      error instanceof PaymentUnavailableError
    ) {
      throw error;
    }

    const detail =
      error instanceof PaystackError
        ? error.message
        : "Could not reach Paystack. Try again in a moment.";

    throw new PaymentUnavailableError(detail);
  }
}

async function loadTarget(orderId: string): Promise<
  | (PaymentTarget & { goodsTotal: number; freightActual: number | null })
  | null
> {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(
      "id, code, public_token, goods_total, freight_amount, customers(email), batches(drops(vendors(paystack_subaccount_code)))",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return null;

  const email = order.customers?.email;
  if (!email) return null;

  return {
    orderId: order.id,
    code: order.code,
    publicToken: order.public_token,
    email,
    amount: 0,
    subaccount:
      order.batches?.drops?.vendors?.paystack_subaccount_code ?? null,
    goodsTotal: order.goods_total,
    freightActual: order.freight_amount,
  };
}

export type ReconcileResult =
  | { outcome: "applied"; orderId: string; stage: "goods" | "freight" }
  | { outcome: "already_applied" }
  | { outcome: "unknown_reference" }
  | { outcome: "amount_mismatch" };

/**
 * Applies a successful charge to the order it belongs to.
 *
 * Paystack retries webhooks until it gets a 200, and the customer's browser
 * hits the callback URL at roughly the same time, so this runs more than once
 * for every payment. Idempotency comes from only acting on a payment row that
 * is still `pending`: the conditional update is atomic, so whichever call
 * arrives second changes nothing.
 */
export async function reconcilePayment(params: {
  reference: string;
  amount: number;
  paidAt: string | null;
  raw: unknown;
}): Promise<ReconcileResult> {
  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("id, order_id, type, amount, status")
    .eq("provider", "paystack")
    .eq("provider_ref", params.reference)
    .maybeSingle();

  if (!payment) return { outcome: "unknown_reference" };
  if (payment.status === "success") return { outcome: "already_applied" };

  // The amount is authoritative from Paystack, not from us. A mismatch means
  // either tampering or a reference collision, and both are worth refusing
  // loudly rather than releasing goods for the wrong money.
  if (params.amount !== payment.amount) {
    await admin
      .from("payments")
      .update({ status: "failed", raw: params.raw as never })
      .eq("id", payment.id);

    return { outcome: "amount_mismatch" };
  }

  const paidAt = params.paidAt ?? new Date().toISOString();

  const { data: claimed } = await admin
    .from("payments")
    .update({ status: "success", paid_at: paidAt, raw: params.raw as never })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  // Another delivery of the same event won the race and already applied it.
  if (!claimed) return { outcome: "already_applied" };

  if (payment.type === "goods") {
    await admin
      .from("orders")
      .update({
        status: "paid",
        goods_paid_at: paidAt,
        // The slot is now bought and paid for; it must never be swept.
        hold_expires_at: null,
      })
      .eq("id", payment.order_id);
  } else {
    await admin
      .from("orders")
      .update({ status: "freight_paid", freight_paid_at: paidAt })
      .eq("id", payment.order_id);

    const { data: order } = await admin
      .from("orders")
      .select("batch_id")
      .eq("id", payment.order_id)
      .maybeSingle();

    if (order?.batch_id) {
      const { settleBatchIfFreightComplete } = await import(
        "@/lib/settlement.server"
      );
      await settleBatchIfFreightComplete(order.batch_id).catch((error) =>
        console.error("[settle] batch after freight", error),
      );
    }
  }

  const { notifyOrderPaid } = await import("@/lib/notify");
  void notifyOrderPaid(
    payment.order_id,
    payment.type === "goods" ? "goods" : "freight",
  ).catch((error) => console.error("[notify] order paid", error));

  return {
    outcome: "applied",
    orderId: payment.order_id,
    stage: payment.type === "goods" ? "goods" : "freight",
  };
}

/**
 * Confirms a reference with Paystack directly, for the redirect back from
 * checkout. The query string is attacker-controlled, so the reference is only
 * a hint: what makes this safe is asking Paystack whether that reference
 * actually succeeded, and for how much.
 */
export async function settleFromCallback(reference: string): Promise<void> {
  if (!isPaystackConfigured()) return;

  try {
    const transaction = await verifyTransaction(reference);
    if (transaction.status !== "success") {
      console.warn(
        "Paystack callback reference is not successful yet",
        reference,
        transaction.status,
      );
      return;
    }

    const result = await reconcilePayment({
      reference: transaction.reference,
      amount: transaction.amount,
      paidAt: transaction.paidAt,
      raw: transaction.raw,
    });

    if (result.outcome === "amount_mismatch") {
      console.error("Paystack callback amount mismatch", reference);
    }
  } catch (error) {
    // The webhook is the source of truth and will retry; a failed lookup here
    // must never block the customer from seeing their order.
    console.error("Paystack callback settle failed", reference, error);
  }
}

export async function startGoodsPayment(
  orderId: string,
): Promise<string | null> {
  const target = await loadTarget(orderId);
  if (!target) {
    if (isPaystackConfigured()) {
      throw new PaymentUnavailableError("Order could not be loaded for payment.");
    }
    return null;
  }

  return start("goods", { ...target, amount: target.goodsTotal });
}

export async function startFreightPayment(
  orderId: string,
): Promise<string | null> {
  const target = await loadTarget(orderId);
  if (!target?.freightActual) {
    if (isPaystackConfigured()) {
      throw new PaymentUnavailableError(
        "Shipping has not been invoiced for this order yet.",
      );
    }
    return null;
  }

  return start("freight", { ...target, amount: target.freightActual });
}
