"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireVendor } from "@/lib/auth";
import { finaliseBatchClose } from "@/lib/batches";
import { fieldErrorsFromZod } from "@/lib/form-errors";
import {
  cancelBatchCutoff,
  cancelBatchOpen,
  scheduleBatchCutoff,
  scheduleBatchOpen,
  triggerStatusBroadcast,
} from "@/lib/jobs";
import type { BatchStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";
import { fromAccraInputValue } from "@/lib/time";
import { requireVendorApproval } from "@/lib/vendor-approval";

export type ActionState = {
  error?: string | null;
  message?: string | null;
  fieldErrors?: Record<string, string>;
};

const BATCH_FIELD_KEYS = [
  "freightMode",
  "opensAt",
  "closesAt",
  "expectedDeliveryAt",
  "freightRateEstimate",
  "autoOpenNext",
] as const;

const batchSchema = z.object({
  dropId: z.uuid(),
  freightMode: z.enum(["air_kg", "sea_cbm"]),
  /** Optional — blank means the vendor opens it manually. */
  opensAt: z.string().optional().or(z.literal("")),
  closesAt: z.string().min(1, "Choose when orders close"),
  expectedDeliveryAt: z.string().optional().or(z.literal("")),
  /** Pesewas per kg or per CBM. */
  freightRateEstimate: z.coerce.number().int().min(0),
  autoOpenNext: z.boolean(),
});

/**
 * `batchId`/`dropId` are hidden inputs, not rendered fields — a Zod issue on
 * either of them has nowhere to land in `BATCH_FIELD_KEYS` and would
 * otherwise vanish with zero feedback. Falling back to the first issue as a
 * top-level error keeps that case visible instead of a silent no-op save.
 */
function fieldErrorsOrFallback(error: z.ZodError): ActionState {
  const fieldErrors = fieldErrorsFromZod(error, BATCH_FIELD_KEYS);
  return Object.keys(fieldErrors).length > 0
    ? { fieldErrors }
    : { error: error.issues[0]?.message ?? "Could not save. Try again." };
}

/**
 * Parses and validates the optional "opens at" field against the (already
 * validated) close time. Returns `null` when left blank — meaning the vendor
 * will open it manually — or a field error to surface on the form.
 */
function parseOpensAt(
  raw: string | undefined,
  closesAt: Date,
): { opensAt: Date | null } | { error: string } {
  if (!raw) return { opensAt: null };

  const opensAt = fromAccraInputValue(raw);
  if (Number.isNaN(opensAt.getTime())) {
    return { error: "Choose a valid start date" };
  }
  if (opensAt.getTime() <= Date.now()) {
    return { error: "The start time has to be in the future" };
  }
  if (opensAt.getTime() >= closesAt.getTime()) {
    return { error: "Must open before it closes" };
  }

  return { opensAt };
}

export async function createBatch(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireVendor();

  const parsed = batchSchema.safeParse({
    dropId: formData.get("dropId"),
    freightMode: formData.get("freightMode"),
    opensAt: formData.get("opensAt") ?? "",
    closesAt: formData.get("closesAt"),
    expectedDeliveryAt: formData.get("expectedDeliveryAt") ?? "",
    freightRateEstimate: Math.round(
      Number(formData.get("freightRateEstimate") ?? 0) * 100,
    ),
    autoOpenNext: formData.get("autoOpenNext") === "on",
  });

  if (!parsed.success) {
    return fieldErrorsOrFallback(parsed.error);
  }

  const closesAt = fromAccraInputValue(parsed.data.closesAt);
  if (Number.isNaN(closesAt.getTime()) || closesAt.getTime() <= Date.now()) {
    return {
      fieldErrors: { closesAt: "The cutoff has to be in the future" },
    };
  }

  const opensAtResult = parseOpensAt(parsed.data.opensAt, closesAt);
  if ("error" in opensAtResult) {
    return { fieldErrors: { opensAt: opensAtResult.error } };
  }
  const { opensAt } = opensAtResult;

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
      opens_at: (opensAt ?? new Date()).toISOString(),
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

  if (opensAt) {
    const runId = await scheduleBatchOpen(data.id, opensAt);
    if (runId) {
      await supabase.from("batches").update({ open_run_id: runId }).eq("id", data.id);
    }
  }

  revalidatePath(`/dashboard/drops/${parsed.data.dropId}/batches`);
  redirect(`/dashboard/drops/${parsed.data.dropId}/batches/${data.id}`);
}

const updateSchema = batchSchema.extend({ batchId: z.uuid() });

export async function updateBatch(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const vendor = await requireVendor();

  const parsed = updateSchema.safeParse({
    batchId: formData.get("batchId"),
    dropId: formData.get("dropId"),
    freightMode: formData.get("freightMode"),
    opensAt: formData.get("opensAt") ?? "",
    closesAt: formData.get("closesAt"),
    expectedDeliveryAt: formData.get("expectedDeliveryAt") ?? "",
    freightRateEstimate: Math.round(
      Number(formData.get("freightRateEstimate") ?? 0) * 100,
    ),
    autoOpenNext: formData.get("autoOpenNext") === "on",
  });

  if (!parsed.success) {
    return fieldErrorsOrFallback(parsed.error);
  }

  const closesAt = fromAccraInputValue(parsed.data.closesAt);
  if (Number.isNaN(closesAt.getTime())) {
    return { fieldErrors: { closesAt: "Choose when orders close" } };
  }

  const supabase = await createClient();
  const { data: batch } = await supabase
    .from("batches")
    .select("status, closes_at, cutoff_run_id, opens_at, open_run_id")
    .eq("id", parsed.data.batchId)
    .maybeSingle();

  if (!batch) return { error: "Batch not found." };

  // The start time is only still a plan, not history, while nothing has
  // opened it yet — ignore a submitted value otherwise rather than rewriting
  // a batch's real opening moment.
  const schedulable = batch.status === "scheduled";
  let opensAt: Date | null = null;
  if (schedulable) {
    const opensAtResult = parseOpensAt(parsed.data.opensAt, closesAt);
    if ("error" in opensAtResult) {
      return { fieldErrors: { opensAt: opensAtResult.error } };
    }
    opensAt = opensAtResult.opensAt;
  }

  // A closed batch given a fresh future cutoff means "reopen it" — editing
  // the date alone used to silently do nothing, since nothing ever flipped
  // the status back or rescheduled the close job, so the batch just stayed
  // "Closed" no matter what date was saved.
  const reopening = batch.status === "closed" && closesAt.getTime() > Date.now();

  // Reopening is a second path to "open", same as `openBatch` — it has to
  // clear the same payout-approval gate, or a vendor whose approval lapsed
  // after closing could resume accepting paid orders just by editing a date.
  if (reopening) {
    const approval = await requireVendorApproval(vendor);
    if (!approval.ok) return { error: approval.error };
  }

  const { error } = await supabase
    .from("batches")
    .update({
      ...(schedulable
        ? { opens_at: (opensAt ?? new Date()).toISOString() }
        : {}),
      ...(reopening
        ? {
            status: "open" as const,
            opens_at: new Date().toISOString(),
            open_run_id: null,
          }
        : {}),
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

  if (error) {
    // Reopening re-triggers the freight-readiness check (a published product
    // missing its weight/volume blocks it), same as the first "Open for
    // orders" — needs the same plain-English translation.
    return { error: reopening ? humaniseBatchError(error.message) : error.message };
  }

  if (reopening) {
    // A closed batch has no cutoff job running (it was cleared on close) and
    // may still carry a stale open_run_id from before it ever opened the
    // first time — both need cleaning up regardless of whether the date text
    // itself changed, since "reopen" always starts the cutoff clock fresh.
    await Promise.all([
      cancelBatchCutoff(batch.cutoff_run_id),
      batch.open_run_id ? cancelBatchOpen(batch.open_run_id) : Promise.resolve(),
    ]);
    const runId = await scheduleBatchCutoff(parsed.data.batchId, closesAt);
    await supabase
      .from("batches")
      .update({ cutoff_run_id: runId })
      .eq("id", parsed.data.batchId);

    await supabase.from("batch_events").insert({
      batch_id: parsed.data.batchId,
      type: "opened",
      message: "Orders are open again.",
    });
  } else if (
    batch.status === "open" &&
    batch.closes_at !== closesAt.toISOString()
  ) {
    // Vendors move cutoffs constantly. A stale delayed run would close the
    // batch at the old time, so the pending run is always cancelled and
    // replaced.
    await cancelBatchCutoff(batch.cutoff_run_id);
    const runId = await scheduleBatchCutoff(parsed.data.batchId, closesAt);
    await supabase
      .from("batches")
      .update({ cutoff_run_id: runId })
      .eq("id", parsed.data.batchId);
  }

  // Same idea for the start time: only reschedule when it actually moved, so
  // an unrelated save doesn't churn the Trigger run.
  if (schedulable) {
    const previousOpensAtIso = batch.open_run_id ? batch.opens_at : null;
    const nextOpensAtIso = opensAt ? opensAt.toISOString() : null;
    if (previousOpensAtIso !== nextOpensAtIso) {
      await cancelBatchOpen(batch.open_run_id);
      const runId = opensAt
        ? await scheduleBatchOpen(parsed.data.batchId, opensAt)
        : null;
      await supabase
        .from("batches")
        .update({ open_run_id: runId })
        .eq("id", parsed.data.batchId);
    }
  }

  revalidatePath(`/dashboard/drops/${parsed.data.dropId}/batches/${parsed.data.batchId}`);
  revalidatePath("/dashboard");
  return {
    message: reopening ? "Batch reopened — orders are accepted again" : "Saved",
  };
}

export async function openBatch(
  batchId: string,
  dropId: string,
): Promise<ActionState> {
  const vendor = await requireVendor();
  const approval = await requireVendorApproval(vendor);
  if (!approval.ok) return { error: approval.error };

  const supabase = await createClient();
  const { data: batch } = await supabase
    .from("batches")
    .select("id, closes_at, drop_id, open_run_id")
    .eq("id", batchId)
    .eq("drop_id", dropId)
    .maybeSingle();

  if (!batch) return { error: "Batch not found." };

  const { error } = await supabase
    .from("batches")
    .update({
      status: "open",
      opens_at: new Date().toISOString(),
      open_run_id: null,
    })
    .eq("id", batchId);

  if (error) {
    // The freight-readiness trigger and the one-open-batch index both surface
    // here, and both need to read as plain English rather than as SQL.
    return { error: humaniseBatchError(error.message) };
  }

  // Opening early makes any scheduled auto-open for this batch redundant.
  await cancelBatchOpen(batch.open_run_id);

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
  const vendor = await requireVendor();
  const supabase = await createClient();

  // Prove ownership under the caller's RLS-scoped session before any branch
  // reaches helpers that use the service role.
  const { data: ownedBatch } = await supabase
    .from("batches")
    .select("id, drops!inner(vendor_id)")
    .eq("id", batchId)
    .eq("drop_id", dropId)
    .eq("drops.vendor_id", vendor.id)
    .maybeSingle();

  if (!ownedBatch) return { error: "Batch not found." };

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
