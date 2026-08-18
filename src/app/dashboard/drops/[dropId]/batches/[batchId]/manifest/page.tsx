import { ClipboardList } from "lucide-react";
import { notFound } from "next/navigation";

import { CopyButton } from "@/components/share/copy-button";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LockedStamp } from "@/components/ui/locked-stamp";
import { requireVendor } from "@/lib/auth";
import { FREIGHT_MODES, formatBillableUnits } from "@/lib/freight";
import { getBatchDetail, shippingOrders } from "@/lib/queries/batch";
import { buildManifest, manifestAsCsv, manifestAsText } from "@/lib/settlement";

export const metadata = { title: "Manifest" };

export default async function ManifestPage({
  params,
}: PageProps<"/dashboard/drops/[dropId]/batches/[batchId]/manifest">) {
  const { batchId } = await params;
  await requireVendor();

  const batch = await getBatchDetail(batchId);
  if (!batch) notFound();

  const locked =
    batch.status === "scheduled" || batch.status === "open";
  const shipping = shippingOrders(batch);
  const lines = buildManifest(batch);
  const text = manifestAsText(batch, lines);
  const csv = manifestAsCsv(lines);
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;

  if (locked) {
    return (
      <div className="flex flex-col items-center justify-center border border-dashed border-border bg-surface px-6 py-14 text-center">
        <LockedStamp size="lg" className="mb-4" />
        <h3 className="font-display text-base font-semibold text-ink">
          Locked until the batch closes
        </h3>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-muted">
          The buy-list is built from paid orders at cutoff, so it cannot change
          while people are still ordering.
        </p>
      </div>
    );
  }

  if (shipping.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Nothing to buy"
        description="This batch closed without any paid orders."
      />
    );
  }

  const totalWeight = lines.reduce((sum, line) => sum + line.weightGrams, 0);
  const totalVolume = lines.reduce((sum, line) => sum + line.volumeCm3, 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">
            What to buy
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            {lines.length} line{lines.length === 1 ? "" : "s"} from{" "}
            {shipping.length} paid order{shipping.length === 1 ? "" : "s"}.{" "}
            {formatBillableUnits("air_kg", totalWeight)}
            {" · "}
            {formatBillableUnits("sea_cbm", totalVolume)}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <CopyButton
            value={text}
            label="Copy for WeChat"
            copiedLabel="Copied"
            toastMessage="Buy-list copied"
            variant="secondary"
            size="sm"
          />
          <ButtonLink href={csvHref} download={`batch-${batch.number}-manifest.csv`} variant="secondary" size="sm">
            Download CSV
          </ButtonLink>
        </div>
      </div>

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="border-b border-border bg-surface-muted text-xs text-ink-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Qty</th>
              <th className="px-4 py-2.5 font-medium">Item</th>
              <th className="px-4 py-2.5 font-medium">
                {FREIGHT_MODES[batch.freightMode].unitLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={`${line.productId}:${line.variantLabel ?? ""}`} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-display font-semibold text-ink" data-numeric>
                  {line.qty}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{line.name}</p>
                  {line.variantLabel && (
                    <p className="text-xs text-ink-muted">{line.variantLabel}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-muted" data-numeric>
                  {formatBillableUnits(
                    batch.freightMode,
                    batch.freightMode === "air_kg"
                      ? line.weightGrams
                      : line.volumeCm3,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
