import "server-only";

import { scheduleBatchCutoff } from "@/lib/jobs";
import { createAdminClient } from "@/lib/supabase/admin";

type ClosedBatch = {
  id: string;
  drop_id: string;
  number: number;
  auto_open_next: boolean;
  freight_mode: "air_kg" | "sea_cbm";
  freight_rate_estimate: number;
  opens_at: string | null;
  closes_at: string;
  expected_delivery_at: string | null;
};

const DEFAULT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * After a batch closes (cutoff job or vendor “Close now”), keep the drop link
 * alive: open a scheduled successor if one exists, otherwise create Batch N+1
 * with the same freight settings and open it immediately. Products live on the
 * drop, so the catalogue carries over automatically.
 */
export async function openSuccessorBatch(
  closed: ClosedBatch,
  now = new Date(),
): Promise<{ openedBatchId: string } | { skipped: true; reason: string }> {
  if (!closed.auto_open_next) {
    return { skipped: true, reason: "auto_open_next_off" };
  }

  const admin = createAdminClient();
  const nowIso = now.toISOString();

  const { data: existingOpen } = await admin
    .from("batches")
    .select("id")
    .eq("drop_id", closed.drop_id)
    .eq("status", "open")
    .maybeSingle();

  if (existingOpen) {
    return { skipped: true, reason: "already_open" };
  }

  const { data: scheduled } = await admin
    .from("batches")
    .select("id, closes_at")
    .eq("drop_id", closed.drop_id)
    .eq("status", "scheduled")
    .order("number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (scheduled) {
    await admin
      .from("batches")
      .update({ status: "open", opens_at: nowIso })
      .eq("id", scheduled.id);

    const runId = await scheduleBatchCutoff(
      scheduled.id,
      new Date(scheduled.closes_at),
    );
    if (runId) {
      await admin
        .from("batches")
        .update({ cutoff_run_id: runId })
        .eq("id", scheduled.id);
    }

    await admin.from("batch_events").insert({
      batch_id: scheduled.id,
      type: "opened",
      message: "Orders are open.",
    });

    return { openedBatchId: scheduled.id };
  }

  // Idempotent across Trigger retries: never invent Batch N+1 twice.
  const { data: existingNext } = await admin
    .from("batches")
    .select("id, status, closes_at")
    .eq("drop_id", closed.drop_id)
    .eq("number", closed.number + 1)
    .maybeSingle();

  if (existingNext) {
    if (existingNext.status === "scheduled") {
      await admin
        .from("batches")
        .update({ status: "open", opens_at: nowIso })
        .eq("id", existingNext.id);
      const runId = await scheduleBatchCutoff(
        existingNext.id,
        new Date(existingNext.closes_at),
      );
      if (runId) {
        await admin
          .from("batches")
          .update({ cutoff_run_id: runId })
          .eq("id", existingNext.id);
      }
    }
    return { openedBatchId: existingNext.id };
  }

  const windowMs = batchWindowMs(closed);
  const closesAt = new Date(now.getTime() + windowMs);
  const expectedDeliveryAt = shiftExpectedDelivery(closed, windowMs);

  const { data: next, error } = await admin
    .from("batches")
    .insert({
      drop_id: closed.drop_id,
      number: closed.number + 1,
      status: "open",
      opens_at: nowIso,
      closes_at: closesAt.toISOString(),
      expected_delivery_at: expectedDeliveryAt,
      freight_mode: closed.freight_mode,
      freight_rate_estimate: closed.freight_rate_estimate,
      auto_open_next: true,
    })
    .select("id")
    .single();

  if (error || !next) {
    console.error("[batches] openSuccessorBatch insert failed", error);
    return { skipped: true, reason: "insert_failed" };
  }

  const runId = await scheduleBatchCutoff(next.id, closesAt);
  if (runId) {
    await admin
      .from("batches")
      .update({ cutoff_run_id: runId })
      .eq("id", next.id);
  }

  await admin.from("batch_events").insert({
    batch_id: next.id,
    type: "opened",
    message: `Batch ${closed.number + 1} opened automatically after Batch ${closed.number} closed.`,
  });

  return { openedBatchId: next.id };
}

function batchWindowMs(batch: ClosedBatch): number {
  if (!batch.opens_at) return DEFAULT_WINDOW_MS;
  const opens = new Date(batch.opens_at).getTime();
  const closes = new Date(batch.closes_at).getTime();
  const span = closes - opens;
  if (!Number.isFinite(span) || span < 60 * 60 * 1000) {
    return DEFAULT_WINDOW_MS;
  }
  return span;
}

function shiftExpectedDelivery(
  batch: ClosedBatch,
  windowMs: number,
): string | null {
  if (!batch.expected_delivery_at) return null;
  const previous = new Date(batch.expected_delivery_at).getTime();
  if (!Number.isFinite(previous)) return null;
  return new Date(previous + windowMs).toISOString();
}

/** Shared close side-effects: cancel unpaid holds, then optionally open next. */
export async function finaliseBatchClose(batchId: string): Promise<{
  closed: string;
  openedBatchId?: string;
}> {
  const admin = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: batch } = await admin
    .from("batches")
    .select(
      "id, drop_id, status, auto_open_next, number, freight_mode, freight_rate_estimate, opens_at, closes_at, expected_delivery_at",
    )
    .eq("id", batchId)
    .maybeSingle();

  if (!batch || (batch.status !== "open" && batch.status !== "closed")) {
    return { closed: batchId };
  }

  // Idempotent: if still open, close it. Manual close may have already set status.
  if (batch.status === "open") {
    await admin
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_at: nowIso,
        hold_expires_at: null,
      })
      .eq("batch_id", batchId)
      .eq("status", "pending_payment");

    await admin
      .from("batches")
      .update({ status: "closed", closed_at: nowIso, cutoff_run_id: null })
      .eq("id", batchId);

    await admin.from("batch_events").insert({
      batch_id: batchId,
      type: "closed",
      message: "Orders are closed. Your batch is being prepared.",
    });
  } else {
    // Already marked closed (manual path) — still clear unpaid holds + cutoff.
    await admin
      .from("orders")
      .update({
        status: "cancelled",
        cancelled_at: nowIso,
        hold_expires_at: null,
      })
      .eq("batch_id", batchId)
      .eq("status", "pending_payment");

    await admin
      .from("batches")
      .update({ cutoff_run_id: null })
      .eq("id", batchId);
  }

  // Only open a successor when we just closed this batch in this call.
  // Retries on an already-closed batch still run openSuccessorBatch, which is
  // idempotent (reuses Batch N+1 if it exists).
  const successor = await openSuccessorBatch(
    {
      id: batch.id,
      drop_id: batch.drop_id,
      number: batch.number,
      auto_open_next: batch.auto_open_next,
      freight_mode: batch.freight_mode,
      freight_rate_estimate: batch.freight_rate_estimate,
      opens_at: batch.opens_at,
      closes_at: batch.closes_at,
      expected_delivery_at: batch.expected_delivery_at,
    },
    now,
  );

  return {
    closed: batchId,
    ...("openedBatchId" in successor
      ? { openedBatchId: successor.openedBatchId }
      : {}),
  };
}
