import { formatGhs } from "@/lib/money";

const BILL = 60_000;

const ORDERS = [
  { name: "Ama", detail: "3 pairs of sneakers", grams: 2700 },
  { name: "Kwame", detail: "1 hoodie", grams: 600 },
  { name: "Yaa", detail: "2 hoodies", grams: 1200 },
  { name: "Efua", detail: "1 pair of sneakers", grams: 900 },
];

const TOTAL_GRAMS = ORDERS.reduce((sum, order) => sum + order.grams, 0);

// Precomputed rather than derived at render time so the illustration is
// deterministic; the real allocation runs through allocateFreight.
const ROWS = ORDERS.map((order) => ({
  ...order,
  share: Math.round((BILL * order.grams) / TOTAL_GRAMS),
  percent: Math.round((order.grams / TOTAL_GRAMS) * 100),
}));

export function FreightExplainer() {
  return (
    <div className="rounded-card border border-border bg-surface p-6">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-4">
        <p className="text-sm text-ink-muted">
          Your forwarder charges for the whole batch
        </p>
        <p className="font-display text-2xl font-semibold text-ink" data-numeric>
          {formatGhs(BILL)}
        </p>
      </div>

      <ul className="space-y-3">
        {ROWS.map((row) => (
          <li key={row.name} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-ink">
                <span className="font-medium">{row.name}</span>
                <span className="text-ink-muted"> &middot; {row.detail}</span>
              </span>
              <span className="shrink-0 font-medium text-ink" data-numeric>
                {formatGhs(row.share)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${row.percent}%` }}
                />
              </div>
              <span
                className="w-20 shrink-0 text-right text-xs text-ink-subtle"
                data-numeric
              >
                {(row.grams / 1000).toFixed(1)} kg
              </span>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-5 border-t border-border pt-4 text-sm leading-relaxed text-ink-muted">
        Everyone pays for what they actually shipped. Ama&rsquo;s three pairs
        weigh more, so she pays more. Nobody subsidises anybody, and the shares
        always add back up to the exact bill you were charged.
      </p>
    </div>
  );
}
