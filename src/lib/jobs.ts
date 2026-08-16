import "server-only";

/**
 * Scheduling façade in front of Trigger.dev.
 *
 * A batch cutoff is a one-off event at a timestamp rather than recurring work,
 * so it is a delayed run keyed by batch and cutoff time. Vendors move cutoffs
 * often, which is why the run id is stored on the batch: editing the date has
 * to cancel the pending run before scheduling a replacement, otherwise the
 * batch closes at the old time.
 *
 * When Trigger.dev is not configured these return null and the caller carries
 * on. Cutoffs are still enforced, because anything reading a batch treats one
 * that is past its cutoff as closed (see `isPastCutoff`).
 */

export function isJobRunnerConfigured(): boolean {
  return Boolean(process.env.TRIGGER_SECRET_KEY);
}

export function batchCutoffKey(batchId: string, closesAt: Date): string {
  return `batch-cutoff-${batchId}-${closesAt.toISOString()}`;
}

/** Returns the run id to store on the batch, or null if unscheduled. */
export async function scheduleBatchCutoff(
  batchId: string,
  closesAt: Date,
): Promise<string | null> {
  if (!isJobRunnerConfigured()) return null;

  const { tasks } = await import("@trigger.dev/sdk");
  const handle = await tasks.trigger(
    "batch-cutoff",
    { batchId },
    {
      delay: closesAt,
      idempotencyKey: batchCutoffKey(batchId, closesAt),
    },
  );

  return handle.id;
}

export async function cancelBatchCutoff(runId: string | null): Promise<void> {
  if (!runId || !isJobRunnerConfigured()) return;

  const { runs } = await import("@trigger.dev/sdk");
  await runs.cancel(runId).catch(() => {
    // A run that already finished or was cancelled is not an error here.
  });
}

export async function scheduleHoldExpiry(
  orderId: string,
  expiresAt: Date,
): Promise<string | null> {
  if (!isJobRunnerConfigured()) return null;

  const { tasks } = await import("@trigger.dev/sdk");
  const handle = await tasks.trigger(
    "hold-expiry",
    { orderId },
    {
      delay: expiresAt,
      idempotencyKey: `hold-expiry-${orderId}`,
    },
  );

  return handle.id;
}

export async function triggerFreightInvoices(
  batchId: string,
): Promise<string | null> {
  if (!isJobRunnerConfigured()) return null;

  const { tasks } = await import("@trigger.dev/sdk");
  const handle = await tasks.trigger(
    "freight-invoice",
    { batchId },
    { idempotencyKey: `freight-invoice-${batchId}` },
  );

  return handle.id;
}

export async function triggerStatusBroadcast(
  batchId: string,
  status: string,
): Promise<string | null> {
  if (!isJobRunnerConfigured()) return null;

  const { tasks } = await import("@trigger.dev/sdk");
  const handle = await tasks.trigger(
    "status-broadcast",
    { batchId, status },
    { idempotencyKey: `status-broadcast-${batchId}-${status}` },
  );

  return handle.id;
}

/**
 * A batch whose cutoff has passed must never keep taking orders, even if the
 * job that was meant to close it never ran. Every read path treats this as
 * authoritative, so the delayed job is an optimisation rather than the only
 * thing standing between a vendor and orders arriving after the deadline.
 */
export function isPastCutoff(closesAt: string | Date): boolean {
  return new Date(closesAt).getTime() <= Date.now();
}
