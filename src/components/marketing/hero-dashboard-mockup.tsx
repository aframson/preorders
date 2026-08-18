import { Check } from "lucide-react";

import { GrainShell } from "@/components/marketing/grain-shell";
import { StatusPill } from "@/components/ui/status-pill";
import { formatGhsCompact } from "@/lib/money";

const ORDERS = [
  { name: "Ama Mensah", item: "Sneakers · 39", paid: 48_000 },
  { name: "Kwame Boateng", item: "Hoodie · L", paid: 32_000 },
  { name: "Yaa Asante", item: "Bag · Crossbody", paid: 18_500 },
  { name: "Efua Mensah", item: "Sneakers · 41", paid: 48_000 },
];

/**
 * Hero product visual: the vendor board (open batch + paid orders), not a
 * chat screenshot — so the first viewport sells ops software.
 */
export function HeroDashboardMockup({ className }: { className?: string }) {
  return (
    <GrainShell className={className}>
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
            China run · Batch 3
          </p>
          <p className="font-display text-lg font-semibold text-ink">
            September drop
          </p>
        </div>
        <StatusPill tone="open" pulse>
          Open · 34 orders
        </StatusPill>
      </header>

      <div className="grid flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-0">
        <div className="flex flex-col gap-4 border-r border-border px-5 py-5">
          <div className="rounded-card bg-surface-muted px-4 py-4">
            <p className="text-xs text-ink-muted">Closes Sunday, 6:00pm Accra</p>
            <p
              className="mt-1 font-display text-3xl font-bold tracking-tight text-ink"
              data-numeric
            >
              2d 14h 08m
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-card border border-border px-3 py-3">
              <dt className="text-xs text-ink-muted">Goods paid</dt>
              <dd
                className="mt-0.5 font-display text-lg font-semibold text-ink"
                data-numeric
              >
                {formatGhsCompact(1_246_000)}
              </dd>
            </div>
            <div className="rounded-card border border-border px-3 py-3">
              <dt className="text-xs text-ink-muted">Units</dt>
              <dd
                className="mt-0.5 font-display text-lg font-semibold text-ink"
                data-numeric
              >
                40
              </dd>
            </div>
          </dl>

          <ol className="mt-auto space-y-2.5 text-sm">
            <li className="flex gap-2.5">
              <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-open text-white">
                <Check className="size-3" strokeWidth={3} />
              </span>
              <span className="text-ink">Batch opened</span>
            </li>
            <li className="flex gap-2.5">
              <span className="mt-0.5 size-5 rounded-full border-2 border-transit bg-surface" />
              <span className="text-ink">Cutoff · buy-list locks</span>
            </li>
            <li className="flex gap-2.5">
              <span className="mt-0.5 size-5 rounded-full border-2 border-border bg-surface" />
              <span className="text-ink-muted">Next batch opens</span>
            </li>
          </ol>
        </div>

        <div className="flex min-h-0 flex-col px-5 py-5">
          <p className="text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
            Paid today
          </p>
          <ul className="mt-3 flex-1 space-y-0">
            {ORDERS.map((order) => (
              <li
                key={order.name}
                className="flex items-baseline justify-between gap-3 border-b border-border/70 py-2.5 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {order.name}
                  </p>
                  <p className="truncate text-xs text-ink-muted">{order.item}</p>
                </div>
                <span
                  className="shrink-0 text-sm font-medium text-ink"
                  data-numeric
                >
                  {formatGhsCompact(order.paid)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </GrainShell>
  );
}
