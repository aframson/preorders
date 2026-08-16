import { Check, Copy } from "lucide-react";

import { GrainShell } from "@/components/marketing/grain-shell";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/cn";
import { formatGhsCompact } from "@/lib/money";

export function ScheduleMockup() {
  return (
    <GrainShell>
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
            Batch 3
          </p>
          <p className="font-display text-lg font-semibold text-ink">
            September drop
          </p>
        </div>
        <StatusPill tone="open" pulse>
          Open · 34 orders
        </StatusPill>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-5 py-5">
        <div className="rounded-card bg-surface-muted px-4 py-4">
          <p className="text-xs text-ink-muted">Closes Sunday, 6:00pm Accra</p>
          <p
            className="mt-1 font-display text-3xl font-bold tracking-tight text-ink"
            data-numeric
          >
            2d 14h 08m
          </p>
        </div>

        <div className="flex items-center justify-between rounded-card border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-ink">Open the next batch</p>
            <p className="text-xs text-ink-muted">
              Batch 4 starts the moment this one closes
            </p>
          </div>
          <span
            className="relative h-6 w-10 rounded-full bg-open"
            aria-hidden
          >
            <span className="absolute top-0.5 right-0.5 size-5 rounded-full bg-white" />
          </span>
        </div>

        <ol className="mt-auto space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-open text-white">
              <Check className="size-3" strokeWidth={3} />
            </span>
            <span className="text-ink">Batch 3 opened Friday 9:00am</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 size-5 rounded-full border-2 border-transit bg-surface" />
            <span className="text-ink">
              Closes Sunday 6:00pm · buy-list locks
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 size-5 rounded-full border-2 border-border bg-surface" />
            <span className="text-ink-muted">Batch 4 opens automatically</span>
          </li>
        </ol>
      </div>
    </GrainShell>
  );
}

const MANIFEST = [
  { item: "Chunky sneakers — Black", size: "39", qty: 8 },
  { item: "Chunky sneakers — Black", size: "41", qty: 5 },
  { item: "Hoodie — Grey", size: "L", qty: 11 },
  { item: "Hoodie — Grey", size: "XL", qty: 7 },
  { item: "Crossbody bag", size: "—", qty: 9 },
];

export function ManifestMockup() {
  return (
    <GrainShell>
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
            What to buy
          </p>
          <p className="font-display text-lg font-semibold text-ink">
            Batch 3 closed
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-control bg-brand-700 px-3 py-1.5 text-xs font-medium text-white">
          <Copy className="size-3.5" aria-hidden />
          Copy for supplier
        </span>
      </header>

      <div className="flex-1 px-5 py-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] text-ink-subtle">
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 font-medium">Size</th>
              <th className="pb-2 text-right font-medium">Qty</th>
            </tr>
          </thead>
          <tbody>
            {MANIFEST.map((row) => (
              <tr
                key={`${row.item}-${row.size}`}
                className="border-b border-border/70 last:border-0"
              >
                <td className="py-2.5 text-ink">{row.item}</td>
                <td className="py-2.5 text-ink-muted">{row.size}</td>
                <td
                  className="py-2.5 text-right font-medium text-ink"
                  data-numeric
                >
                  {row.qty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border bg-surface-muted px-5 py-3 text-sm">
        <span className="text-ink-muted">34 paid orders</span>
        <span className="font-semibold text-ink" data-numeric>
          40 units
        </span>
      </div>
    </GrainShell>
  );
}

const SHARES = [
  { name: "Ama", detail: "3 sneakers", share: 30_000, pct: 50 },
  { name: "Yaa", detail: "2 hoodies", share: 13_200, pct: 22 },
  { name: "Efua", detail: "1 sneakers", share: 10_200, pct: 17 },
  { name: "Kwame", detail: "1 hoodie", share: 6_600, pct: 11 },
];

export function FreightSplitMockup() {
  return (
    <GrainShell>
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
            Forwarder bill
          </p>
          <p className="font-display text-2xl font-bold tracking-tight text-ink" data-numeric>
            {formatGhsCompact(60_000)}
          </p>
        </div>
        <StatusPill tone="arrived">Split by weight</StatusPill>
      </header>

      <ul className="flex-1 space-y-3.5 px-5 py-5">
        {SHARES.map((row) => (
          <li key={row.name} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span>
                <span className="font-medium text-ink">{row.name}</span>
                <span className="text-ink-muted"> · {row.detail}</span>
              </span>
              <span className="font-medium text-ink" data-numeric>
                {formatGhsCompact(row.share)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${row.pct}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t border-border px-5 py-3">
        <p className="rounded-control bg-brand-700 py-2.5 text-center text-sm font-medium text-white">
          Send 34 shipping invoices
        </p>
      </div>
    </GrainShell>
  );
}

const TRACK = [
  { label: "Order confirmed", done: true, at: "12 Aug" },
  { label: "Bought from supplier", done: true, at: "14 Aug" },
  { label: "On its way", done: false, current: true, note: "Just now · Goods left the warehouse" },
  { label: "Arrived in Accra", done: false },
  { label: "With you", done: false },
];

export function LiveUpdatesMockup() {
  return (
    <GrainShell>
      <header className="border-b border-border px-5 py-4">
        <p className="text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
          AK-1842 · Ama Mensah
        </p>
        <p className="font-display text-lg font-semibold text-ink">
          Where her order is
        </p>
      </header>

      <div className="flex-1 px-5 py-5">
        <ol>
          {TRACK.map((step, index) => {
            const last = index === TRACK.length - 1;
            return (
              <li key={step.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                      step.done && "border-open bg-open text-white",
                      step.current && "border-transit bg-transit-tint text-transit",
                      !step.done && !step.current && "border-border bg-surface",
                    )}
                  >
                    {step.done ? (
                      <Check className="size-3.5" strokeWidth={3} />
                    ) : (
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          step.current ? "bg-transit" : "bg-border-strong",
                        )}
                      />
                    )}
                  </span>
                  {!last && (
                    <span
                      className={cn(
                        "w-px flex-1",
                        step.done ? "bg-open" : "bg-border",
                      )}
                    />
                  )}
                </div>
                <div className={cn("min-w-0 pb-5", last && "pb-0")}>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      step.done || step.current ? "text-ink" : "text-ink-subtle",
                    )}
                  >
                    {step.label}
                  </p>
                  {step.at && (
                    <p className="text-xs text-ink-muted" data-numeric>
                      {step.at}
                    </p>
                  )}
                  {step.note && (
                    <p className="mt-1 rounded-lg bg-transit-tint px-2.5 py-1.5 text-xs text-transit">
                      {step.note}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </GrainShell>
  );
}
