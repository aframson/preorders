import { Container } from "@/components/ui/container";
import { cn } from "@/lib/cn";

/**
 * Copy beside a mockup. Grain stays inside the frame — no halo on the page.
 */
export function FeatureStage({
  id,
  eyebrow,
  title,
  children,
  mockup,
  reverse = false,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  mockup: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn("relative overflow-hidden py-20", id && "scroll-mt-20")}
    >
      <Container
        className={cn(
          "grid items-center gap-10 lg:gap-x-16",
          reverse
            ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]"
            : "lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]",
        )}
      >
        <div
          className={cn(
            "relative z-10 max-w-xl",
            reverse && "lg:order-2",
          )}
        >
          <p className="text-sm font-medium tracking-wide text-brand-600 uppercase">
            {eyebrow}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h2>
          <div className="mt-4 space-y-3 text-base leading-relaxed text-ink-muted">
            {children}
          </div>
        </div>

        <div
          className={cn(
            "relative h-[min(26rem,88vw)] lg:h-[32rem]",
            reverse && "lg:order-1",
          )}
          aria-hidden
        >
          {mockup}
        </div>
      </Container>
    </section>
  );
}
