import { task } from "@trigger.dev/sdk";

import { finaliseBatchClose, openScheduledBatch } from "@/lib/batches";

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

/**
 * Opens a batch at its scheduled start time. A no-op if the vendor already
 * opened it early, closed it, or it's no longer eligible (products missing a
 * shipping size, payout no longer approved) — see `openScheduledBatch`.
 */
export const batchOpen = task({
  id: "batch-open",
  retry: { maxAttempts: 3 },
  run: async (payload: { batchId: string }) => {
    return openScheduledBatch(payload.batchId);
  },
});

/** Releases a slot if the goods payment never landed. */
export const holdExpiry = task({
  id: "hold-expiry",
  retry: { maxAttempts: 3 },
  run: async (payload: { orderId: string }) => {
    const { releaseUnpaidHold } = await import("@/lib/holds");
    return releaseUnpaidHold(payload.orderId);
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

/** Send a web-push notification to every device registered for a vendor. */
export const vendorPush = task({
  id: "vendor-push",
  retry: { maxAttempts: 3 },
  run: async (payload: {
    vendorId: string;
    title: string;
    body: string;
    url?: string;
    tag?: string;
  }) => {
    const { sendVendorPush } = await import("@/lib/push");
    return sendVendorPush(payload.vendorId, {
      title: payload.title,
      body: payload.body,
      url: payload.url,
      tag: payload.tag,
    });
  },
});
