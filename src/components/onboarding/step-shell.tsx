import { cn } from "@/lib/cn";

const STEPS = ["Account", "Business", "Get paid", "First drop"] as const;

export function StepShell({
  step,
  title,
  description,
  children,
}: {
  /** 1-indexed position in STEPS. */
  step: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md">
      <div className="flex items-center gap-2" role="list" aria-label="Progress">
        {STEPS.map((label, index) => {
          const position = index + 1;
          const done = position < step;
          const current = position === step;
          return (
            <div
              key={label}
              role="listitem"
              aria-current={current ? "step" : undefined}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                done || current ? "bg-brand-700" : "bg-border",
              )}
            >
              <span className="sr-only">
                {label}
                {done ? " (done)" : current ? " (current step)" : ""}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs font-medium tracking-wide text-ink-subtle uppercase">
        Step {step} of {STEPS.length}
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
        {title}
      </h1>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {description}
        </p>
      )}

      <div className="mt-7">{children}</div>
    </div>
  );
}
