import { Check } from "lucide-react";
import Link from "next/link";

import { CopyButton } from "@/components/share/copy-button";
import { Countdown } from "@/components/ui/countdown";
import { LockedStamp } from "@/components/ui/locked-stamp";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/cn";
import { PLATFORM_FEE_PERCENT } from "@/lib/fees";
import { formatGhsCompact, percentOf } from "@/lib/money";
import {
  batchStats,
  shippingOrders,
  type BatchDetail,
  type BatchOrder,
} from "@/lib/queries/batch";
import {
  buildManifest,
  manifestAsText,
  type ManifestLine,
} from "@/lib/settlement";
import { BATCH_STATUS, batchTone } from "@/lib/status";
import { formatAccraDateTime } from "@/lib/time";

function orderItemSummary(order: BatchOrder): string {
  const first = order.items[0];
  if (!first) return "Order";
  const name = first.snapshot.productName ?? "Item";
  const variant =
    first.snapshot.variantName && first.snapshot.variantValue
      ? first.snapshot.variantValue
      : first.snapshot.variantValue;
  const base = variant ? `${name} · ${variant}` : name;
  const extra = order.items.length > 1 ? ` +${order.items.length - 1}` : "";
  return `${base}${extra}`;
}

function BoardStep({
  label,
  done,
  current,
}: {
  label: string;
  done?: boolean;
  current?: boolean;
}) {
  return (
    <li className="flex gap-2.5">
      {done ? (
        <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-open text-white">
          <Check className="size-3" strokeWidth={3} aria-hidden />
        </span>
      ) : (
        <span
          className={cn(
            "mt-0.5 size-5 rounded-full border-2 bg-surface",
            current ? "border-transit" : "border-border",
          )}
          aria-hidden
        />
      )}
      <span className={cn("text-sm", !done && !current && "text-ink-muted")}>
        {label}
      </span>
    </li>
  );
}

/**
 * Vendor batch “board” — open window, paid orders, supplier buy-list — matching
 * the marketing platform peek so the product looks like what we sell.
 */
export function BatchBoard({
  batch,
  dropId,
}: {
  batch: BatchDetail;
  dropId: string;
}) {
  const closesAt = new Date(batch.closesAt);
  const opensAt = new Date(batch.opensAt);
  const tone = batchTone(batch.status, closesAt);
  const stats = batchStats(batch);
  const paid = shippingOrders(batch);
  const recent = paid.slice(0, 8);
  const lines = buildManifest(batch).slice(0, 8);
  const goodsPaid = stats.value;
  const fee = percentOf(goodsPaid, PLATFORM_FEE_PERCENT.goods);
  const yourShare = goodsPaid - fee;
  const locked = batch.status === "scheduled" || batch.status === "open";
  const copyText = manifestAsText(batch, buildManifest(batch));
  const base = `/dashboard/drops/${dropId}/batches/${batch.id}`;

  return (
    <div className="-mx-5 -mt-6 overflow-hidden border-b border-border bg-surface lg:-mx-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-5 py-4 lg:px-8">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
            Batch {batch.number}
            {batch.status === "open" ? " · Open window" : ""}
          </p>
          <h2 className="font-display text-xl font-semibold text-ink">
            {batch.dropTitle}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={tone} pulse={tone === "open" || tone === "closing"}>
            {BATCH_STATUS[batch.status].label}
            {stats.orderCount > 0 ? ` · ${stats.orderCount} orders` : ""}
          </StatusPill>
          {batch.status === "open" && (
            <span className="hidden rounded-control bg-surface-muted px-3 py-1.5 text-xs text-ink-muted sm:inline">
              Closes {formatAccraDateTime(closesAt)}
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-5 lg:border-r lg:border-b-0 lg:px-8">
          {batch.status === "open" ? (
            <div className="rounded-card bg-surface-muted px-4 py-4">
              <p className="text-xs text-ink-muted">Time left to order</p>
              <Countdown
                target={closesAt}
                className="mt-1 block font-display text-3xl font-bold tracking-tight text-ink"
              />
            </div>
          ) : batch.status === "scheduled" ? (
            <div className="rounded-card bg-surface-muted px-4 py-4">
              <p className="text-xs text-ink-muted">Opens</p>
              <p className="mt-1 font-display text-xl font-bold tracking-tight text-ink">
                {formatAccraDateTime(opensAt)}
              </p>
            </div>
          ) : (
            <div className="rounded-card bg-surface-muted px-4 py-4">
              <p className="text-xs text-ink-muted">Batch status</p>
              <p className="mt-1 font-display text-xl font-bold tracking-tight text-ink">
                {BATCH_STATUS[batch.status].label}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Closed {formatAccraDateTime(closesAt)}
              </p>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-card border border-border px-3 py-3">
              <dt className="text-xs text-ink-muted">Goods paid</dt>
              <dd
                className="mt-0.5 font-display text-lg font-semibold text-ink"
                data-numeric
              >
                {formatGhsCompact(goodsPaid)}
              </dd>
            </div>
            <div className="rounded-card border border-border px-3 py-3">
              <dt className="text-xs text-ink-muted">Your share</dt>
              <dd
                className="mt-0.5 font-display text-lg font-semibold text-ink"
                data-numeric
              >
                {formatGhsCompact(yourShare)}
              </dd>
            </div>
          </dl>

          <ol className="space-y-2.5">
            <BoardStep
              label={`Batch opened ${formatAccraDateTime(opensAt)}`}
              done={batch.status !== "scheduled"}
              current={batch.status === "scheduled"}
            />
            <BoardStep
              label={`Cutoff · buy-list locks · ${formatAccraDateTime(closesAt)}`}
              done={batch.status !== "scheduled" && batch.status !== "open"}
              current={batch.status === "open"}
            />
            <BoardStep
              label={
                batch.autoOpenNext
                  ? "Next batch opens automatically"
                  : "Next batch not set to auto-open"
              }
              done={false}
            />
          </ol>
        </div>

        <div className="border-b border-border px-5 py-5 lg:border-r lg:border-b-0 lg:px-8">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
              Recent paid orders
            </p>
            {paid.length > recent.length && (
              <Link
                href={`${base}#all-orders`}
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                View all
              </Link>
            )}
          </div>

          {recent.length === 0 ? (
            <p className="mt-6 text-sm text-ink-muted">
              {batch.status === "open"
                ? "Share your link. Paid orders land here."
                : "No paid orders in this batch."}
            </p>
          ) : (
            <ul className="mt-3">
              {recent.map((order) => (
                <li
                  key={order.id}
                  className="flex items-baseline justify-between gap-3 border-b border-border/70 py-2.5 last:border-0"
                >
                  <Link
                    href={`/o/${order.publicToken}`}
                    className="min-w-0 transition-colors hover:text-brand-700"
                  >
                    <p className="truncate text-sm font-medium text-ink">
                      {order.customer.name}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {orderItemSummary(order)}
                    </p>
                  </Link>
                  <span
                    className="shrink-0 text-sm font-medium text-ink"
                    data-numeric
                  >
                    {formatGhsCompact(order.goodsTotal)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col px-5 py-5 lg:px-8">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
              Supplier buy-list
            </p>
            {locked ? (
              <div className="flex items-center gap-2">
                <LockedStamp size="sm" />
                <Link
                  href={`${base}/manifest`}
                  className="text-xs font-medium text-brand-700 hover:text-brand-800"
                >
                  Full list
                </Link>
              </div>
            ) : lines.length > 0 ? (
              <CopyButton
                value={copyText}
                label="Copy"
                copiedLabel="Copied"
                toastMessage="Buy-list copied"
                size="sm"
              />
            ) : (
              <Link
                href={`${base}/manifest`}
                className="text-xs font-medium text-brand-700 hover:text-brand-800"
              >
                Full list
              </Link>
            )}
          </div>

          {lines.length === 0 ? (
            <p className="mt-6 text-sm text-ink-muted">
              {locked
                ? "Builds from paid orders. Locks at cutoff."
                : "Nothing to buy yet."}
            </p>
          ) : (
            <>
              <ManifestPreview lines={lines} />
              <p className="mt-auto pt-4 text-xs text-ink-muted">
                {locked
                  ? "Live preview — locks the moment the batch closes."
                  : `${stats.unitCount} units from ${stats.orderCount} paid orders.`}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ManifestPreview({ lines }: { lines: ManifestLine[] }) {
  return (
    <table className="mt-3 w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-[11px] text-ink-subtle">
          <th className="pb-2 font-medium">Item</th>
          <th className="pb-2 font-medium">Size</th>
          <th className="pb-2 text-right font-medium">Qty</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <tr
            key={`${line.productId}-${line.variantLabel ?? ""}`}
            className="border-b border-border/70 last:border-0"
          >
            <td className="max-w-[10rem] truncate py-2.5 text-ink">
              {line.name}
            </td>
            <td className="py-2.5 text-ink-muted">
              {line.variantLabel ?? "—"}
            </td>
            <td className="py-2.5 text-right font-medium" data-numeric>
              {line.qty}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
