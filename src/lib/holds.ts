import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cancels an order whose goods payment never landed, freeing its stock slot.
 * Guarded on `pending_payment`, so it's a no-op for anything already paid. A
 * payment that arrives afterwards still applies: `reconcilePayment` marks the
 * order paid regardless of this cancellation.
 */
export async function releaseUnpaidHold(
  orderId: string,
): Promise<{ released: boolean }> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data } = await admin
    .from("orders")
    .update({
      status: "cancelled",
      cancelled_at: now,
      hold_expires_at: null,
    })
    .eq("id", orderId)
    .eq("status", "pending_payment")
    .select("id")
    .maybeSingle();

  return { released: Boolean(data) };
}
