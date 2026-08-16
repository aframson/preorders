import { task } from "@trigger.dev/sdk";

import { scheduleBatchCutoff } from "@/lib/jobs";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Closes a batch at its cutoff. Unpaid holds are released so they never
 * inflate the supplier manifest. If the drop is set to auto-open the next
 * batch, a scheduled successor is opened here.
 */
export const batchCutoff = task({
  id: "batch-cutoff",
  retry: { maxAttempts: 3 },
  run: async (payload: { batchId: string }) => {
    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { data: batch } = await admin
      .from("batches")
      .select("id, drop_id, status, auto_open_next, number, freight_mode, freight_rate_estimate, expected_delivery_at")
      .eq("id", payload.batchId)
      .maybeSingle();

    if (!batch || batch.status !== "open") return { skipped: true };

    await admin
      .from("orders")
      .update({ status: "cancelled", cancelled_at: now, hold_expires_at: null })
      .eq("batch_id", payload.batchId)
      .eq("status", "pending_payment");

    await admin
      .from("batches")
      .update({ status: "closed", closed_at: now, cutoff_run_id: null })
      .eq("id", payload.batchId);

    await admin.from("batch_events").insert({
      batch_id: payload.batchId,
      type: "closed",
      message: "Orders are closed. Your batch is being prepared.",
    });

    if (batch.auto_open_next) {
      const { data: next } = await admin
        .from("batches")
        .select("id, closes_at")
        .eq("drop_id", batch.drop_id)
        .eq("status", "scheduled")
        .order("number", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (next) {
        await admin
          .from("batches")
          .update({ status: "open", opens_at: now })
          .eq("id", next.id);

        const runId = await scheduleBatchCutoff(next.id, new Date(next.closes_at));
        if (runId) {
          await admin
            .from("batches")
            .update({ cutoff_run_id: runId })
            .eq("id", next.id);
        }

        await admin.from("batch_events").insert({
          batch_id: next.id,
          type: "opened",
          message: "Orders are open.",
        });
      }
    }

    return { closed: payload.batchId };
  },
});

/** Releases a slot if the goods payment never landed. */
export const holdExpiry = task({
  id: "hold-expiry",
  retry: { maxAttempts: 3 },
  run: async (payload: { orderId: string }) => {
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
    // Emails are sent inline from finaliseFreight; this job remains for
    // Trigger dashboards / future WhatsApp fan-out.
    return { batchId: payload.batchId };
  },
});

export const statusBroadcast = task({
  id: "status-broadcast",
  retry: { maxAttempts: 3 },
  run: async (payload: { batchId: string; status: string }) => {
    // Emails are sent inline from setBatchStatus.
    return payload;
  },
});
