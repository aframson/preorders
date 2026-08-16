import { CalendarClock, PackageCheck } from "lucide-react";

import { Countdown } from "@/components/ui/countdown";
import { cn } from "@/lib/cn";
import type { PublicBatch } from "@/lib/queries/public-drop";
import { batchTone, TONE_CLASSES } from "@/lib/status";
import { formatAccraDateTime, formatDeliveryWindow } from "@/lib/time";

/**
 * The first thing a visitor from WhatsApp reads. It has to answer three
 * questions before they scroll: can I order, how long do I have, and are other
 * people already in.
 */
export function BatchBanner({
  openBatch,
  nextBatch,
  notifySlot,
}: {
  openBatch: PublicBatch | null;
  nextBatch: PublicBatch | null;
  /** Email capture, shown only when nothing is open. */
  notifySlot?: React.ReactNode;
}) {
  if (openBatch) {
    const closesAt = new Date(openBatch.closesAt);
    const tone = batchTone("open", closesAt);
    const edge =
      tone === "open"
        ? "border-open/40"
        : tone === "closing"
          ? "border-closing/40"
          : "border-border";

    return (
      <section
        className={cn(
          "relative overflow-hidden border-y px-5 py-4",
          edge,
          TONE_CLASSES[tone],
        )}
      >
        <span
          aria-hidden
          className="bg-grain-heavy pointer-events-none absolute inset-0 mix-blend-multiply opacity-50 dark:mix-blend-overlay dark:opacity-45"
        />
        <div className="relative mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="font-display text-base font-semibold">
            Batch {openBatch.number} is open
          </p>
          <p className="text-sm font-medium">
            <Countdown target={closesAt} /> left
          </p>
          <p className="w-full text-sm opacity-90">
            Closes {formatAccraDateTime(closesAt)}
            {openBatch.orderCount > 0 && (
              <> &middot; {openBatch.orderCount} orders in</>
            )}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-border bg-surface-muted px-5 py-4">
      <div className="mx-auto max-w-3xl">
        <p className="flex items-center gap-2 font-display text-base font-semibold text-ink">
          <CalendarClock className="size-4 text-ink-muted" aria-hidden />
          Orders are closed right now
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {nextBatch
            ? `Batch ${nextBatch.number} opens ${formatAccraDateTime(new Date(nextBatch.opensAt))}.`
            : "The next batch has not been scheduled yet."}
        </p>
        {notifySlot && <div className="mt-3">{notifySlot}</div>}
      </div>
    </section>
  );
}

export function DeliveryExpectation({ batch }: { batch: PublicBatch }) {
  if (!batch.expectedDeliveryAt) return null;

  return (
    <p className="flex items-center gap-2 border-b border-border px-5 py-3 text-sm text-ink-muted">
      <PackageCheck className="size-4 shrink-0 text-ink-subtle" aria-hidden />
      Expected in Accra:{" "}
      <span className="font-medium text-ink">
        {formatDeliveryWindow(new Date(batch.expectedDeliveryAt))}
      </span>
    </p>
  );
}
