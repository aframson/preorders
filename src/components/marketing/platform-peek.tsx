"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BrowserFrame } from "@/components/marketing/browser-frame";
import { Container } from "@/components/ui/container";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/cn";
import { formatGhsCompact } from "@/lib/money";

const ORDERS = [
  { name: "Ama Mensah", item: "Chunky sneakers — Black · 39", paid: 48_000 },
  { name: "Kwame Boateng", item: "Hoodie — Grey · L", paid: 32_000 },
  { name: "Yaa Asante", item: "Crossbody bag", paid: 18_500 },
  { name: "Efua Mensah", item: "Chunky sneakers — Black · 41", paid: 48_000 },
  { name: "Kofi Owusu", item: "Hoodie — Grey · XL", paid: 32_000 },
  { name: "Abena Darko", item: "Sneakers — White · 40", paid: 48_000 },
];

const MANIFEST = [
  { item: "Chunky sneakers — Black", size: "39", qty: 8 },
  { item: "Chunky sneakers — Black", size: "41", qty: 5 },
  { item: "Hoodie — Grey", size: "L", qty: 11 },
  { item: "Hoodie — Grey", size: "XL", qty: 7 },
  { item: "Crossbody bag", size: "—", qty: 9 },
];

/**
 * Half-height peek at the vendor board — sits right under the hero so
 * visitors see how the product looks before the feature essays.
 */
export function PlatformPeek() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      ([entry]) => setInView(reduced.matches || entry.isIntersecting),
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="pb-6 pt-4 lg:pb-10 lg:pt-2">
      <Container>
        <p className="text-sm font-medium tracking-wide text-brand-600 uppercase">
          The board
        </p>
        <h2 className="mt-2 max-w-xl font-display text-2xl font-bold tracking-tight sm:text-3xl">
          See the board your batch runs on
        </h2>
        <p className="mt-2 max-w-xl text-ink-muted">
          Open window, paid orders, supplier buy-list — one place instead of a
          week of chat screenshots.
        </p>

        <div
          ref={ref}
          className={cn("platform-peek mt-8", inView && "is-in")}
          aria-hidden
        >
          <div className="platform-peek-frame">
            <BrowserFrame url="preorders.app/dashboard/drops/china-run/batches/3">
              <div className="relative isolate min-h-[36rem] bg-surface lg:min-h-[42rem]">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
                      China run · Batch 3
                    </p>
                    <p className="font-display text-xl font-semibold text-ink">
                      September drop
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone="open" pulse>
                      Open · 34 orders
                    </StatusPill>
                    <span className="hidden rounded-control bg-surface-muted px-3 py-1.5 text-xs text-ink-muted sm:inline">
                      Closes Sun 6:00pm Accra
                    </span>
                  </div>
                </header>

                <div className="grid flex-1 gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
                  <div className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:px-6 lg:border-r lg:border-b-0">
                    <div className="rounded-card bg-surface-muted px-4 py-4">
                      <p className="text-xs text-ink-muted">
                        Time left to order
                      </p>
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
                          className="mt-0.5 font-display text-lg font-semibold"
                          data-numeric
                        >
                          {formatGhsCompact(1_246_000)}
                        </dd>
                      </div>
                      <div className="rounded-card border border-border px-3 py-3">
                        <dt className="text-xs text-ink-muted">Your share</dt>
                        <dd
                          className="mt-0.5 font-display text-lg font-semibold"
                          data-numeric
                        >
                          {formatGhsCompact(1_221_080)}
                        </dd>
                      </div>
                    </dl>
                    <ol className="space-y-2.5 text-sm">
                      <li className="flex gap-2.5">
                        <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-open text-white">
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                        <span>Batch opened Friday 9:00am</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="mt-0.5 size-5 rounded-full border-2 border-transit bg-surface" />
                        <span>Cutoff · buy-list locks</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="mt-0.5 size-5 rounded-full border-2 border-border bg-surface" />
                        <span className="text-ink-muted">
                          Batch 4 opens automatically
                        </span>
                      </li>
                    </ol>
                  </div>

                  <div className="border-b border-border px-5 py-5 sm:px-6 lg:border-r lg:border-b-0">
                    <p className="text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
                      Recent paid orders
                    </p>
                    <ul className="mt-3">
                      {ORDERS.map((order) => (
                        <li
                          key={order.name}
                          className="flex items-baseline justify-between gap-3 border-b border-border/70 py-2.5 last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">
                              {order.name}
                            </p>
                            <p className="truncate text-xs text-ink-muted">
                              {order.item}
                            </p>
                          </div>
                          <span
                            className="shrink-0 text-sm font-medium"
                            data-numeric
                          >
                            {formatGhsCompact(order.paid)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-col px-5 py-5 sm:px-6">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-medium tracking-wide text-ink-subtle uppercase">
                        Supplier buy-list
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-control bg-brand-700 px-2.5 py-1 text-[11px] font-medium text-white">
                        <Copy className="size-3" aria-hidden />
                        Copy
                      </span>
                    </div>
                    <table className="mt-3 w-full text-sm">
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
                            <td className="py-2.5 text-ink-muted">
                              {row.size}
                            </td>
                            <td
                              className="py-2.5 text-right font-medium"
                              data-numeric
                            >
                              {row.qty}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-auto pt-4 text-xs text-ink-muted">
                      Locks the moment the batch closes — ready to send.
                    </p>
                  </div>
                </div>
              </div>
            </BrowserFrame>
          </div>
        </div>
      </Container>
    </section>
  );
}
