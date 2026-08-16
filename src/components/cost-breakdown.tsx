import { cn } from "@/lib/cn";
import type { Pesewas } from "@/lib/money";
import { MoneyRow } from "@/components/ui/money-row";

type Line = { label: string; amount: Pesewas; muted?: boolean };

type CostBreakdownProps = {
  lines: Line[];
  payNow: { label: string; amount: Pesewas };
  /**
   * Money the customer will owe later. Kept visually separate from the total
   * so it can never be misread as part of today's payment, which is the
   * failure mode that makes customers abandon a shipping invoice weeks later.
   */
  deferred?: {
    label: string;
    amount: Pesewas;
    note: string;
    estimate?: boolean;
  } | null;
  className?: string;
};

export function CostBreakdown({
  lines,
  payNow,
  deferred,
  className,
}: CostBreakdownProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        {lines.map((line) => (
          <MoneyRow
            key={line.label}
            label={line.label}
            amount={line.amount}
            muted={line.muted}
          />
        ))}
      </div>

      <div className="border-t border-border pt-3">
        <MoneyRow label={payNow.label} amount={payNow.amount} strong />
      </div>

      {deferred && (
        <div className="rounded-card border border-dashed border-border-strong bg-surface-muted/60 p-3">
          <MoneyRow
            label={deferred.label}
            amount={deferred.amount}
            muted
            hint={
              deferred.estimate ? (
                <span className="ml-1 text-xs text-ink-subtle">(estimate)</span>
              ) : null
            }
          />
          <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
            {deferred.note}
          </p>
        </div>
      )}
    </div>
  );
}
