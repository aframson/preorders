import { notFound } from "next/navigation";

import { Tabs } from "@/components/dashboard/tabs";
import { Countdown } from "@/components/ui/countdown";
import { StatusPill } from "@/components/ui/status-pill";
import { requireVendor } from "@/lib/auth";
import { FREIGHT_MODES, formatBillableUnits } from "@/lib/freight";
import { formatGhs } from "@/lib/money";
import { batchStats, getBatchDetail } from "@/lib/queries/batch";
import { settleBatchIfFreightComplete } from "@/lib/settlement.server";
import { BATCH_STATUS, batchTone } from "@/lib/status";
import { formatAccraDateTime, formatDeliveryWindow } from "@/lib/time";
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
  const closesAt = new Date(batch.closesAt);
  const tone = batchTone(batch.status, closesAt);
  const base = `/dashboard/drops/${dropId}/batches/${batchId}`;

  return (
    <>
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-ink">
              Batch {batch.number}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill tone={tone} pulse={tone === "closing"}>
                {BATCH_STATUS[batch.status].label}
              </StatusPill>
              {batch.status === "open" && (
                <span className="text-sm text-ink-muted">
                  <Countdown target={closesAt} /> left
                </span>
              )}
            </div>

            <p className="mt-2 text-sm text-ink-muted">
              {FREIGHT_MODES[batch.freightMode].label} &middot; closes{" "}
              {formatAccraDateTime(closesAt)}
              {batch.expectedDeliveryAt && (
                <>
                  {" "}
                  &middot; expected{" "}
                  {formatDeliveryWindow(new Date(batch.expectedDeliveryAt))}
                </>
              )}
            </p>
          </div>

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

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Orders" value={String(stats.orderCount)} />
          <Stat label="Units" value={String(stats.unitCount)} />
          <Stat label="Value" value={formatGhs(stats.value)} />
          <Stat
            label={
              FREIGHT_MODES[batch.freightMode].unitLabel === "kg"
                ? "Weight"
                : "Volume"
            }
            value={formatBillableUnits(
              batch.freightMode,
              stats.freightUnitsTotal,
            )}
          />
        </dl>
      </div>

      <Tabs
        items={[
          { href: base, label: "Orders", exact: true },
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-surface px-4 py-3">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd
        className="mt-0.5 font-display text-lg font-semibold text-ink"
        data-numeric
      >
        {value}
      </dd>
    </div>
  );
}
