import Link from "next/link";

import { CountdownRing } from "@/components/ui/countdown";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/cn";
import { formatGhs } from "@/lib/money";
import { BATCH_STATUS, TONE_ACCENT, batchTone, type BatchStatus } from "@/lib/status";
import { formatAccraDateTime } from "@/lib/time";

export type BatchSummary = {
  id: string;
  dropId: string;
  number: number;
  status: BatchStatus;
  opensAt: string;
  closesAt: string;
  orderCount: number;
  value: number;
};

/**
 * The one card a vendor checks between customers: how long is left, how many
 * orders are in, and how much money that is.
 */
export function BatchCard({
  batch,
  className,
}: {
  batch: BatchSummary;
  className?: string;
}) {
  const closesAt = new Date(batch.closesAt);
  const opensAt = new Date(batch.opensAt);
  const tone = batchTone(batch.status, closesAt);
  const isOpen = batch.status === "open";
  // A scheduled batch has not closed yet either, so the cutoff is still a
  // future event rather than a past one.
  const cutoffIsFuture = isOpen || batch.status === "scheduled";

  return (
    <Link
      href={`/dashboard/drops/${batch.dropId}/batches/${batch.id}`}
      className={cn(
        "block rounded-card border border-border bg-surface p-5 transition-colors hover:border-brand-300",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-xl font-bold tracking-tight text-ink">
            Batch {batch.number}
          </p>
          <StatusPill tone={tone} pulse={tone === "closing"} className="mt-2">
            {BATCH_STATUS[batch.status].label}
          </StatusPill>

          <p className="mt-3 text-sm text-ink-muted">
            {cutoffIsFuture ? "Closes" : "Closed"}{" "}
            {formatAccraDateTime(closesAt)}
          </p>
        </div>

        {isOpen && (
          <CountdownRing
            target={closesAt}
            from={opensAt}
            className={cn("shrink-0", TONE_ACCENT[tone])}
          />
        )}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4">
        <div>
          <dt className="text-xs text-ink-muted">Orders in</dt>
          <dd
            className="font-display text-2xl font-bold text-ink"
            data-numeric
          >
            {batch.orderCount}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Collected</dt>
          <dd
            className="font-display text-2xl font-bold text-ink"
            data-numeric
          >
            {formatGhs(batch.value)}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
