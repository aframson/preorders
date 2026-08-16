import { cn } from "@/lib/cn";
import { formatGhs, type Pesewas } from "@/lib/money";

export function MoneyRow({
  label,
  amount,
  muted = false,
  strong = false,
  hint,
  className,
}: {
  label: React.ReactNode;
  amount: Pesewas;
  muted?: boolean;
  strong?: boolean;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", className)}>
      <span
        className={cn(
          "text-sm",
          muted ? "text-ink-muted" : "text-ink",
          strong && "font-medium",
        )}
      >
        {label}
        {hint}
      </span>
      <span
        data-numeric
        className={cn(
          "shrink-0 text-sm",
          muted ? "text-ink-muted" : "text-ink",
          strong && "font-display text-base font-semibold",
        )}
      >
        {formatGhs(amount)}
      </span>
    </div>
  );
}
