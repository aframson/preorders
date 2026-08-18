"use client";

import { Check, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BrowserFrame } from "@/components/marketing/browser-frame";
import { Container } from "@/components/ui/container";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/cn";
import { formatGhsCompact } from "@/lib/money";

const CHAOS = [
  { who: "???", text: "still available???", skew: "-rotate-1" },
  { who: "K.", text: "add me 1 L … wait XL", skew: "rotate-1" },
  { who: "A.", text: "[photo] [photo] [MoMo]", skew: "-rotate-0.5" },
  { who: "You", text: "who paid already???", out: true, skew: "rotate-0.5" },
  { who: "E.", text: "has it shipped???", skew: "-rotate-1" },
  { who: "Y.", text: "change to 3 not 2", skew: "rotate-1" },
  { who: "???", text: "same as yesterday pls", skew: "-rotate-0.5" },
  { who: "M.", text: "sent 480 check", skew: "rotate-0.5" },
];

/**
 * Visual argument for the headline: chat chaos vs the clean batch board.
 * Minimal labels only — the layout does the selling.
 */
export function BeforeAfterSplit() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      ([entry]) => setInView(reduced.matches || entry.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-12 lg:py-16">
      <Container>
        <div
          ref={ref}
          className={cn(
            "before-after-split grid overflow-hidden rounded-[1.1rem] border border-border bg-surface md:grid-cols-2",
            inView && "is-in",
          )}
          aria-hidden
        >
          <div className="relative border-b border-border md:border-r md:border-b-0">
            <p className="absolute top-3 left-3 z-20 rounded-control bg-ink/80 px-2.5 py-1 text-[10px] font-medium tracking-wide text-ink-inverse uppercase backdrop-blur-sm">
              Before
            </p>
            <ChaosThread />
          </div>

          <div className="relative min-h-[22rem] bg-canvas sm:min-h-[26rem]">
            <p className="absolute top-3 left-3 z-20 rounded-control bg-brand-700 px-2.5 py-1 text-[10px] font-medium tracking-wide text-white uppercase">
              After
            </p>
            <div className="h-full p-3 pt-10 sm:p-4 sm:pt-11">
              <BrowserFrame
                url="preorders.app/dashboard/…/batches/3"
                className="h-full rounded-xl shadow-none"
              >
                <CleanBoardMini />
              </BrowserFrame>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function ChaosThread() {
  return (
    <div className="relative h-full min-h-[22rem] overflow-hidden sm:min-h-[26rem]">
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#e5ddd5",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23c4b8ae' stroke-width='1' opacity='0.45'%3E%3Cpath d='M18 22c6 4 8 12 2 16'/%3E%3Cpath d='M86 18c-4 8 2 14 10 10'/%3E%3Ccircle cx='42' cy='64' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "140px 140px",
        }}
      />

      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-[#008069]/95 px-3 py-2.5 text-white blur-[0.3px]">
        <div className="size-8 rounded-full bg-white/25" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-wide">
            Group chat
          </p>
          <p className="truncate text-[11px] text-white/70">48 participants</p>
        </div>
      </div>

      <div className="absolute inset-0 space-y-2 overflow-hidden px-3 pt-14 pb-4">
        {CHAOS.map((msg, index) => (
          <div
            key={`${msg.who}-${index}`}
            className={cn(
              "max-w-[88%] rounded-2xl px-3 py-2 shadow-sm",
              msg.skew,
              msg.out
                ? "ml-auto rounded-br-md bg-[#d9fdd3]"
                : "rounded-bl-md bg-white",
            )}
            style={{ opacity: 0.55 + (index % 3) * 0.12 }}
          >
            {!msg.out && (
              <p className="text-[10px] font-semibold text-[#02a698]">{msg.who}</p>
            )}
            <p className="text-[13px] leading-snug text-[#111b21]">{msg.text}</p>
            <span className="mt-0.5 flex items-center justify-end gap-0.5 text-[9px] text-[#667781]">
              9:{30 + index}
              {msg.out && <CheckCheck className="size-3 text-[#53bdeb]" />}
            </span>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[rgba(253,251,248,0.18)] backdrop-blur-[2.5px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[rgba(229,221,213,0.95)] to-transparent" />
    </div>
  );
}

function CleanBoardMini() {
  return (
    <div className="bg-surface">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="text-[10px] font-medium tracking-wide text-ink-subtle uppercase">
            Batch 3 · Open window
          </p>
          <p className="font-display text-base font-semibold text-ink">
            September drop
          </p>
        </div>
        <StatusPill tone="open" pulse className="text-[10px]">
          34 orders
        </StatusPill>
      </header>

      <div className="grid grid-cols-2 gap-0">
        <div className="space-y-3 border-r border-border px-4 py-4">
          <div className="rounded-card bg-surface-muted px-3 py-3">
            <p className="text-[10px] text-ink-muted">Time left</p>
            <p
              className="mt-0.5 font-display text-2xl font-bold tracking-tight"
              data-numeric
            >
              2d 14h
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-ink-muted">Paid</p>
              <p className="font-semibold" data-numeric>
                {formatGhsCompact(1_246_000)}
              </p>
            </div>
            <div>
              <p className="text-ink-muted">Share</p>
              <p className="font-semibold" data-numeric>
                {formatGhsCompact(1_221_080)}
              </p>
            </div>
          </div>
        </div>

        <ul className="px-4 py-3">
          {[
            { name: "Ama", item: "Sneakers · 39", paid: 48_000 },
            { name: "Kwame", item: "Hoodie · L", paid: 32_000 },
            { name: "Yaa", item: "Bag", paid: 18_500 },
          ].map((row) => (
            <li
              key={row.name}
              className="flex items-baseline justify-between gap-2 border-b border-border/70 py-2 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-ink">
                  {row.name}
                </p>
                <p className="truncate text-[10px] text-ink-muted">{row.item}</p>
              </div>
              <span className="shrink-0 text-xs font-medium" data-numeric>
                {formatGhsCompact(row.paid)}
              </span>
            </li>
          ))}
          <li className="mt-2 flex items-center gap-1.5 text-[10px] text-open">
            <Check className="size-3" strokeWidth={3} aria-hidden />
            Paid · tracked
          </li>
        </ul>
      </div>
    </div>
  );
}
