import { Ship } from "lucide-react";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { requireVendor } from "@/lib/auth";
import { FREIGHT_MODES, formatBillableUnits } from "@/lib/freight";
import { formatGhs } from "@/lib/money";
import { getBatchDetail, shippingOrders } from "@/lib/queries/batch";
import { previewFreight } from "@/lib/settlement";
import { FreightForm } from "./freight-form";

export const metadata = { title: "Shipping" };

export default async function FreightPage({
  params,
}: PageProps<"/dashboard/drops/[dropId]/batches/[batchId]/freight">) {
  const { batchId } = await params;
  await requireVendor();

  const batch = await getBatchDetail(batchId);
  if (!batch) notFound();

  const shipping = shippingOrders(batch);

  if (shipping.length === 0) {
    return (
      <EmptyState
        icon={Ship}
        title="No paid orders to split"
        description="Shipping is split across customers who have paid for their goods. Come back after the batch has orders in."
      />
    );
  }

  const preview = previewFreight(
    batch,
    batch.freightTotalActual ?? 0,
    null,
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="font-display text-lg font-semibold text-ink">
          Split the shipping bill
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Enter what you are charging. Each customer pays in proportion to the{" "}
          {FREIGHT_MODES[batch.freightMode].unitLabel} in their order. Preview
          the split before anything is sent.
        </p>
      </div>

      {batch.freightFinalisedAt && batch.freightTotalActual !== null && (
        <p className="rounded-card border border-open/30 bg-open-tint px-4 py-3 text-sm text-ink">
          Invoices already sent for {formatGhs(batch.freightTotalActual)} across{" "}
          {formatBillableUnits(batch.freightMode, preview.unitsTotal)}. Unpaid
          orders stay held until the customer pays.
        </p>
      )}

      <FreightForm
        batchId={batch.id}
        dropId={batch.dropId}
        freightMode={batch.freightMode}
        unitsTotal={preview.unitsTotal}
        alreadyFinalised={Boolean(batch.freightFinalisedAt)}
        rows={preview.rows.map((row) => ({
          orderId: row.orderId,
          code: row.code,
          customerName: row.customerName,
          units: row.units,
          estimate: row.estimate,
        }))}
      />
    </div>
  );
}
