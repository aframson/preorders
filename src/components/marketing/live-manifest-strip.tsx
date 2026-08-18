"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Container } from "@/components/ui/container";
import { LockedStamp } from "@/components/ui/locked-stamp";
import { cn } from "@/lib/cn";
import { formatGhsCompact } from "@/lib/money";

const LEDGER = [
  { item: "Sneakers — Black", size: "39", qty: 8 },
  { item: "Hoodie — Grey", size: "L", qty: 11 },
  { item: "Crossbody bag", size: "—", qty: 9 },
];

/**
 * Thin motion strip that teases system behaviour — stamp, progress, ledger —
 * without another full screenshot.
 */
export function LiveManifestStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      ([entry]) => setInView(reduced.matches || entry.isIntersecting),
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="pb-10 pt-2 lg:pb-14">
      <Container>
        <div
          ref={ref}
          className={cn(
            "live-manifest-strip overflow-hidden rounded-[1.1rem] border border-border bg-surface",
            inView && "is-in",
          )}
          aria-hidden
        >
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-stretch sm:gap-0 sm:px-0 sm:py-0">
            {/* Stamp badge */}
            <div className="flex items-center justify-center border-border sm:w-[11rem] sm:border-r sm:px-5 sm:py-5">
              <div className="live-stamp">
                <LockedStamp size="lg" />
              </div>
            </div>

            {/* Progress fill */}
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 sm:px-6 sm:py-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
                  Batch filling
                </p>
                <p className="text-xs font-medium text-ink" data-numeric>
                  34 / 40
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <div className="live-progress h-full rounded-full bg-brand-600" />
              </div>
              <p className="text-xs text-ink-muted">
                Goods paid{" "}
                <span className="font-medium text-ink" data-numeric>
                  {formatGhsCompact(1_246_000)}
                </span>
              </p>
            </div>

            {/* Ledger rows appearing */}
            <div className="min-w-0 border-border sm:w-[min(100%,20rem)] sm:border-l sm:px-5 sm:py-4">
              <p className="mb-2 text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
                Buy-list writing itself
              </p>
              <ul className="space-y-1.5">
                {LEDGER.map((row, index) => (
                  <li
                    key={`${row.item}-${row.size}`}
                    className="live-ledger-row flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs"
                    style={{ ["--row-i" as string]: index }}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Check
                        className="size-3 shrink-0 text-open"
                        strokeWidth={3}
                        aria-hidden
                      />
                      <span className="truncate text-ink">{row.item}</span>
                      <span className="shrink-0 text-ink-muted">{row.size}</span>
                    </span>
                    <span className="font-medium text-ink" data-numeric>
                      ×{row.qty}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
