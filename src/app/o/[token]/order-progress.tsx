import { Check } from "lucide-react";

import { cn } from "@/lib/cn";
import type { BatchStatus, OrderStatus } from "@/lib/status";
import { formatAccraDate } from "@/lib/time";

/**
 * The whole point of the tracking page: a customer who paid weeks ago wants to
 * know, in one glance, where their money is. Five steps, no jargon, and the
 * current one is stated in words rather than only implied by colour.
 */
const STEPS = [
  { key: "paid", label: "Order confirmed" },
  { key: "purchased", label: "Bought from supplier" },
  { key: "in_transit", label: "On its way to Ghana" },
  { key: "arrived", label: "Arrived in Accra" },
  { key: "collected", label: "With you" },
] as const;

function currentStep(status: OrderStatus, batchStatus: BatchStatus): number {
  if (status === "collected") return 4;
  if (status === "awaiting_freight" || status === "freight_paid") return 3;
  if (status === "in_transit") return 2;
  if (status === "purchased") return 1;
  if (status === "paid") {
    // The order sits at "paid" until the vendor moves the whole batch, so the
    // batch is the more truthful signal once buying starts.
    if (batchStatus === "arrived" || batchStatus === "freight_invoiced") return 3;
    if (batchStatus === "in_transit") return 2;
    if (batchStatus === "purchasing") return 1;
    return 0;
  }
  return 0;
}

export function OrderProgress({
  status,
  batchStatus,
  expectedDeliveryAt,
  fulfilment = "pickup",
}: {
  status: OrderStatus;
  batchStatus: BatchStatus;
  expectedDeliveryAt: string | null;
  fulfilment?: "pickup" | "delivery";
}) {
  if (status === "pending_payment" || status === "cancelled") return null;

  const active = currentStep(status, batchStatus);
  const finalLabel =
    fulfilment === "delivery" ? "Delivered" : "Picked up";

  return (
    <section className="rounded-card border border-border bg-surface p-4">
      <ol className="space-y-0">
        {STEPS.map((step, index) => {
          const done = index < active;
          const now = index === active;
          const last = index === STEPS.length - 1;
          const label = step.key === "collected" ? finalLabel : step.label;

          return (
            <li key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    done && "border-settled bg-settled text-white",
                    now && "border-open bg-open-tint text-open",
                    !done && !now && "border-border bg-surface",
                  )}
                >
                  {done ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        now ? "bg-open" : "bg-border-strong",
                      )}
                      aria-hidden
                    />
                  )}
                </span>
                {!last && (
                  <span
                    className={cn(
                      "w-0.5 flex-1",
                      done ? "bg-settled" : "bg-border",
                    )}
                    aria-hidden
                  />
                )}
              </div>

              <div className={cn("pb-5", last && "pb-0")}>
                <p
                  className={cn(
                    "text-sm",
                    now ? "font-medium text-ink" : "text-ink-muted",
                  )}
                >
                  {label}
                  {now && <span className="sr-only"> (current step)</span>}
                </p>
                {now && index === 2 && expectedDeliveryAt && (
                  <p className="text-xs text-ink-subtle">
                    Expected {formatAccraDate(expectedDeliveryAt)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
