import { notFound } from "next/navigation";

import { requireVendor } from "@/lib/auth";
import { getBatchDetail } from "@/lib/queries/batch";
import { hasScheduledStart } from "@/lib/status";
import { toAccraInputValue } from "@/lib/time";
import { BatchForm } from "../../batch-form";

export const metadata = { title: "Batch settings" };

export default async function BatchSettingsPage({
  params,
}: PageProps<"/dashboard/drops/[dropId]/batches/[batchId]/settings">) {
  const { dropId, batchId } = await params;
  await requireVendor();

  const batch = await getBatchDetail(batchId);
  if (!batch) notFound();

  const canScheduleOpen = batch.status === "scheduled";
  const scheduledStart = hasScheduledStart(batch);
  const canReopen = batch.status === "closed";

  return (
    <div className="-mx-5 -mt-6 border-b border-border bg-surface px-5 py-6 lg:-mx-8 lg:px-8">
      {canReopen && (
        <p className="mb-5 rounded-card border border-closing/30 bg-closing-tint px-4 py-3 text-sm text-ink">
          This batch is closed. Pick a new future date for <strong>Orders
          close</strong> below and save — that reopens it for orders. Just
          editing the date without moving it into the future will not reopen it.
        </p>
      )}
      <BatchForm
        dropId={dropId}
        submitLabel={canReopen ? "Reopen with this date" : "Save changes"}
        canScheduleOpen={canScheduleOpen}
        initial={{
          batchId: batch.id,
          freightMode: batch.freightMode,
          opensAt: scheduledStart
            ? toAccraInputValue(new Date(batch.opensAt))
            : "",
          closesAt: toAccraInputValue(new Date(batch.closesAt)),
          expectedDeliveryAt: batch.expectedDeliveryAt
            ? toAccraInputValue(new Date(batch.expectedDeliveryAt)).slice(0, 10)
            : "",
          freightRateEstimate: batch.freightRateEstimate,
          autoOpenNext: batch.autoOpenNext,
        }}
      />
    </div>
  );
}
