import { task } from "@trigger.dev/sdk";

import { finaliseBatchClose } from "@/lib/batches";

/**
 * Closes a batch at its cutoff. Unpaid holds are released so they never
 * inflate the supplier manifest. When auto_open_next is on, the next batch
 * for the same drop (same catalogue) opens automatically.
 */
export const batchCutoff = task({
  id: "batch-cutoff",
  retry: { maxAttempts: 3 },
  run: async (payload: { batchId: string }) => {
    return finaliseBatchClose(payload.batchId);
  },
});

/** Releases a slot if the goods payment never landed. */
export const holdExpiry = task({
  id: "hold-expiry",
  retry: { maxAttempts: 3 },
  run: async (payload: { orderId: string }) => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { data } = await admin
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_at: now,
        hold_expires_at: null,
      })
      .eq("id", payload.orderId)
      .eq("status", "pending_payment")
      .select("id")
      .maybeSingle();

    return { released: Boolean(data) };
  },
});

/**
 * Fan-out hook after freight invoices are written. Email/WhatsApp delivery
 * lands here later; for now the tracking page is the source of truth and this
 * run exists so the schedule is real rather than a no-op.
 */
export const freightInvoice = task({
  id: "freight-invoice",
  retry: { maxAttempts: 3 },
  run: async (payload: { batchId: string }) => {
    return { batchId: payload.batchId };
  },
});

export const statusBroadcast = task({
  id: "status-broadcast",
  retry: { maxAttempts: 3 },
  run: async (payload: { batchId: string; status: string }) => {
    return payload;
  },
});
