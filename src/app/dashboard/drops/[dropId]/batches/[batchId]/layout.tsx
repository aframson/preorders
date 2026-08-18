import { notFound } from "next/navigation";

import { Tabs } from "@/components/dashboard/tabs";
import { requireVendor } from "@/lib/auth";
import { batchStats, getBatchDetail } from "@/lib/queries/batch";
import { settleBatchIfFreightComplete } from "@/lib/settlement.server";
import { StatusControl } from "./status-control";

export default async function BatchLayout({
  children,
  params,
}: LayoutProps<"/dashboard/drops/[dropId]/batches/[batchId]">) {
  const { dropId, batchId } = await params;
  await requireVendor();

  let batch = await getBatchDetail(batchId);
  if (!batch) notFound();

  // Heal batches that stayed on "Shipping invoiced" after everyone paid.
  if (batch.status === "freight_invoiced" || batch.status === "arrived") {
    const healed = await settleBatchIfFreightComplete(batchId);
    if (healed === "settled" || healed === "already_settled") {
      batch = (await getBatchDetail(batchId)) ?? batch;
    }
  }

  const stats = batchStats(batch);
  const base = `/dashboard/drops/${dropId}/batches/${batchId}`;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          Batch {batch.number}
          <span className="text-ink-subtle"> · </span>
          {batch.dropTitle}
        </p>
        <StatusControl
          batchId={batchId}
          dropId={dropId}
          status={batch.status}
          canSettle={
            (batch.status === "freight_invoiced" ||
              batch.status === "arrived") &&
            stats.awaitingFreight === 0 &&
            Boolean(batch.freightFinalisedAt)
          }
        />
      </div>

      <Tabs
        items={[
          { href: base, label: "Board", exact: true },
          { href: `${base}/manifest`, label: "Manifest" },
          { href: `${base}/freight`, label: "Shipping" },
          { href: `${base}/timeline`, label: "Timeline" },
          { href: `${base}/settings`, label: "Settings" },
        ]}
      />

      {children}
    </>
  );
}
