"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireVendor } from "@/lib/auth";
import { finaliseBatchClose } from "@/lib/batches";
import { cancelBatchCutoff, scheduleBatchCutoff, triggerStatusBroadcast } from "@/lib/jobs";
import { requireVerifiedPayout } from "@/lib/payout-verification";
import type { BatchStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";
import { fromAccraInputValue } from "@/lib/time";

export type ActionState = { error?: string | null; message?: string | null };

const batchSchema = z.object({
  dropId: z.uuid(),
  freightMode: z.enum(["air_kg", "sea_cbm"]),
  closesAt: z.string().min(1, "Choose when orders close"),
  expectedDeliveryAt: z.string().optional().or(z.literal("")),
  /** Pesewas per kg or per CBM. */
  freightRateEstimate: z.coerce.number().int().min(0),
  autoOpenNext: z.boolean(),
});

export async function createBatch(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireVendor();

  const parsed = batchSchema.safeParse({
    dropId: formData.get("dropId"),
    freightMode: formData.get("freightMode"),
    closesAt: formData.get("closesAt"),
    expectedDeliveryAt: formData.get("expectedDeliveryAt") ?? "",
    freightRateEstimate: Math.round(
      Number(formData.get("freightRateEstimate") ?? 0) * 100,
    ),
    autoOpenNext: formData.get("autoOpenNext") === "on",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const closesAt = fromAccraInputValue(parsed.data.closesAt);
  if (Number.isNaN(closesAt.getTime()) || closesAt.getTime() <= Date.now()) {
    return { error: "The cutoff has to be in the future" };
  }

  const supabase = await createClient();

  const { data: last } = await supabase
    .from("batches")
    .select("number")
    .eq("drop_id", parsed.data.dropId)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("batches")
    .insert({
      drop_id: parsed.data.dropId,
      number: (last?.number ?? 0) + 1,
      status: "scheduled",
      closes_at: closesAt.toISOString(),
      expected_delivery_at: parsed.data.expectedDeliveryAt
        ? fromAccraInputValue(
            `${parsed.data.expectedDeliveryAt}T12:00`,
          ).toISOString()
        : null,
      freight_mode: parsed.data.freightMode,
      freight_rate_estimate: parsed.data.freightRateEstimate,
      auto_open_next: parsed.data.autoOpenNext,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create the batch." };
  }

  revalidatePath(`/dashboard/drops/${parsed.data.dropId}/batches`);
  redirect(`/dashboard/drops/${parsed.data.dropId}/batches/${data.id}`);
}

const updateSchema = batchSchema.extend({ batchId: z.uuid() });

export async function updateBatch(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireVendor();

  const parsed = updateSchema.safeParse({
    batchId: formData.get("batchId"),
    dropId: formData.get("dropId"),
    freightMode: formData.get("freightMode"),
    closesAt: formData.get("closesAt"),
    expectedDeliveryAt: formData.get("expectedDeliveryAt") ?? "",
    freightRateEstimate: Math.round(
      Number(formData.get("freightRateEstimate") ?? 0) * 100,
    ),
    autoOpenNext: formData.get("autoOpenNext") === "on",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const closesAt = fromAccraInputValue(parsed.data.closesAt);
  if (Number.isNaN(closesAt.getTime())) {
    return { error: "Choose when orders close" };
  }

  const supabase = await createClient();
  const { data: batch } = await supabase
    .from("batches")
    .select("status, closes_at, cutoff_run_id")
    .eq("id", parsed.data.batchId)
    .maybeSingle();

  if (!batch) return { error: "Batch not found." };

  const { error } = await supabase
    .from("batches")
    .update({
      closes_at: closesAt.toISOString(),
      expected_delivery_at: parsed.data.expectedDeliveryAt
        ? fromAccraInputValue(
            `${parsed.data.expectedDeliveryAt}T12:00`,
          ).toISOString()
        : null,
      freight_mode: parsed.data.freightMode,
      freight_rate_estimate: parsed.data.freightRateEstimate,
      auto_open_next: parsed.data.autoOpenNext,
    })
    .eq("id", parsed.data.batchId);

  if (error) return { error: error.message };

  // Vendors move cutoffs constantly. A stale delayed run would close the batch
  // at the old time, so the pending run is always cancelled and replaced.
  if (batch.status === "open" && batch.closes_at !== closesAt.toISOString()) {
    await cancelBatchCutoff(batch.cutoff_run_id);
    const runId = await scheduleBatchCutoff(parsed.data.batchId, closesAt);
    await supabase
      .from("batches")
      .update({ cutoff_run_id: runId })
      .eq("id", parsed.data.batchId);
  }

  revalidatePath(`/dashboard/drops/${parsed.data.dropId}/batches/${parsed.data.batchId}`);
  return { message: "Saved" };
}

export async function openBatch(
  batchId: string,
  dropId: string,
): Promise<ActionState> {
  const vendor = await requireVendor();
  const payout = await requireVerifiedPayout(vendor);
  if (!payout.ok) return { error: payout.error };

  const supabase = await createClient();
  const { data: batch } = await supabase
    .from("batches")
    .select("id, closes_at, drop_id")
    .eq("id", batchId)
    .maybeSingle();

  if (!batch) return { error: "Batch not found." };

  const { error } = await supabase
    .from("batches")
    .update({ status: "open", opens_at: new Date().toISOString() })
    .eq("id", batchId);

  if (error) {
    // The freight-readiness trigger and the one-open-batch index both surface
    // here, and both need to read as plain English rather than as SQL.
    return { error: humaniseBatchError(error.message) };
  }

  const runId = await scheduleBatchCutoff(batchId, new Date(batch.closes_at));
  if (runId) {
    await supabase
      .from("batches")
      .update({ cutoff_run_id: runId })
      .eq("id", batchId);
  }

  await supabase.from("batch_events").insert({
    batch_id: batchId,
    type: "opened",
    message: "Orders are open.",
  });

  revalidatePath(`/dashboard/drops/${dropId}/batches/${batchId}`);
  revalidatePath("/dashboard");
  return { message: "Batch is open" };
}

function humaniseBatchError(message: string): string {
  if (message.includes("one_open_batch_per_drop")) {
    return "Another batch is already open on this link. Close it first.";
  }
  if (message.includes("Cannot open batch")) {
    return message.replace(/^.*Cannot open batch: /, "Cannot open batch: ");
  }
  return message;
}

const STATUS_EVENT: Partial<Record<BatchStatus, string>> = {
  closed: "Orders are closed. Your batch is being prepared.",
  purchasing: "We are buying from the supplier now.",
  in_transit: "Your goods have left the supplier and are on the way.",
  arrived: "Your goods have arrived in Ghana.",
  settled: "All shipping fees are paid. This batch is complete.",
};

export async function setBatchStatus(
  batchId: string,
  dropId: string,
  status: BatchStatus,
): Promise<ActionState> {
  await requireVendor();

  if (status === "closed") {
    const result = await finaliseBatchClose(batchId);
    const message = STATUS_EVENT.closed;
    if (message) {
      const { notifyBatchCustomers } = await import("@/lib/notify");
      void notifyBatchCustomers(batchId, message, status).catch((error) =>
        console.error("[notify] batch status", error),
      );
    }
    await triggerStatusBroadcast(batchId, status);
    revalidatePath(`/dashboard/drops/${dropId}/batches/${batchId}`);
    if (result.openedBatchId) {
      revalidatePath(
        `/dashboard/drops/${dropId}/batches/${result.openedBatchId}`,
      );
    }
    revalidatePath(`/dashboard/drops/${dropId}/batches`);
    revalidatePath("/dashboard");
    return {
      message: result.openedBatchId
        ? "Batch closed — the next batch is open with the same products"
        : "Batch closed",
    };
  }

  const supabase = await createClient();

  if (status === "settled") {
    const { settleBatchIfFreightComplete } = await import(
      "@/lib/settlement.server"
    );
    const result = await settleBatchIfFreightComplete(batchId);
    if (result === "not_ready") {
      return {
        error:
          "Some customers still owe shipping, or this batch is not ready to complete yet.",
      };
    }

    if (result === "settled") {
      const message = STATUS_EVENT.settled;
      if (message) {
        const { notifyBatchCustomers } = await import("@/lib/notify");
        void notifyBatchCustomers(batchId, message, status).catch((error) =>
          console.error("[notify] batch status", error),
        );
      }
      await triggerStatusBroadcast(batchId, status);
    }

    revalidatePath(`/dashboard/drops/${dropId}/batches/${batchId}`);
    revalidatePath("/dashboard");
    return {
      message:
        result === "already_settled"
          ? "Batch is already complete"
          : "Batch marked complete",
    };
  }

  const { error } = await supabase
    .from("batches")
    .update({ status })
    .eq("id", batchId);

  if (error) return { error: humaniseBatchError(error.message) };

  const message = STATUS_EVENT[status];
  if (message) {
    await supabase
      .from("batch_events")
      .insert({ batch_id: batchId, type: status, message });

    const { notifyBatchCustomers } = await import("@/lib/notify");
    void notifyBatchCustomers(batchId, message, status).catch((error) =>
      console.error("[notify] batch status", error),
    );
  }

  await triggerStatusBroadcast(batchId, status);

  revalidatePath(`/dashboard/drops/${dropId}/batches/${batchId}`);
  revalidatePath("/dashboard");
  return { message: "Status updated" };
}

export async function postBatchUpdate(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireVendor();

  const batchId = String(formData.get("batchId") ?? "");
  const dropId = String(formData.get("dropId") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!message) return { error: "Write something first" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("batch_events")
    .insert({ batch_id: batchId, type: "update", message });

  if (error) return { error: error.message };

  const { notifyBatchCustomers } = await import("@/lib/notify");
  void notifyBatchCustomers(batchId, message).catch((err) =>
    console.error("[notify] batch update", err),
  );

  revalidatePath(`/dashboard/drops/${dropId}/batches/${batchId}`);
  return { message: "Posted and emailed to every customer in this batch" };
}
