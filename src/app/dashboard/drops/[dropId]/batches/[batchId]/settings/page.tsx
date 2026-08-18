import { notFound } from "next/navigation";

import { requireVendor } from "@/lib/auth";
import { getBatchDetail } from "@/lib/queries/batch";
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

  return (
    <div className="-mx-5 -mt-6 border-b border-border bg-surface px-5 py-6 lg:-mx-8 lg:px-8">
      <BatchForm
        dropId={dropId}
        submitLabel="Save changes"
        initial={{
          batchId: batch.id,
          freightMode: batch.freightMode,
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
