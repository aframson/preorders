import { cn } from "@/lib/cn";

/**
 * Film grain on a mockup. Multiply lives on this frame (no ancestor mask),
 * so the speckle actually composites onto the UI.
 */
export function GrainShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative isolate flex h-full flex-col overflow-hidden rounded-[1.35rem] bg-surface",
        className,
      )}
    >
      <div className="relative z-0 flex min-h-0 flex-1 flex-col">{children}</div>
      <span className="grain-film grain-drift pointer-events-none z-20" />
      <span className="grain-film-soft grain-drift-alt pointer-events-none z-20" />
    </div>
  );
}
